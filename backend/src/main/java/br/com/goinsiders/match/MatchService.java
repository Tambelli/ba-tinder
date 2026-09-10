package br.com.goinsiders.match;

import static br.com.goinsiders.match.Models.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;
import org.springframework.core.env.Environment;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
class MatchService {
    private final JdbcTemplate db;
    private final String matchMode;
    private final String commissionMode;
    static final RowMapper<Creator> CREATOR = (r,n) -> new Creator(r.getLong("id"),r.getString("name"),r.getString("handle"),
        r.getString("creator_niche"),r.getString("product_niche"),r.getString("state"),r.getString("city"),
        r.getLong("followers"),r.getDouble("engagement"),r.getString("bio"),r.getString("color"));
    MatchService(JdbcTemplate db, Environment env) {
        this.db=db;
        matchMode=env.getProperty("app.match-mode", "MEDIATED");
        commissionMode=env.getProperty("app.commission-mode", "INCLUDED");
        if (!Set.of("MEDIATED","DOUBLE_OPT_IN").contains(matchMode) || !Set.of("INCLUDED","ADDED").contains(commissionMode))
            throw new IllegalStateException("MATCH_MODE ou COMMISSION_MODE inválido");
    }
    String matchMode() { return matchMode; }
    String commissionMode() { return commissionMode; }
    List<Creator> creators(String productNiche, String creatorNiche, String state, long minFollowers, long maxFollowers, double minEngagement, double maxEngagement) {
        if(minFollowers < 0 || maxFollowers < minFollowers || minEngagement < 0 || maxEngagement > 100 || maxEngagement < minEngagement
            || !Double.isFinite(minEngagement) || !Double.isFinite(maxEngagement)) throw bad("Faixas de filtro inválidas.");
        var sql = new StringBuilder("SELECT * FROM creators WHERE followers BETWEEN ? AND ? AND engagement BETWEEN ? AND ?");
        List<Object> params = new ArrayList<>(List.of(minFollowers,maxFollowers,minEngagement,maxEngagement));
        for(var filter : new String[][]{{"product_niche",productNiche},{"creator_niche",creatorNiche},{"state",state}}) {
            if(filter[1] != null && !filter[1].isBlank()) { sql.append(" AND LOWER(").append(filter[0]).append(") = LOWER(?)"); params.add(filter[1]); }
        }
        sql.append(" ORDER BY engagement DESC, followers DESC, id");
        return db.query(sql.toString(),CREATOR,params.toArray());
    }
    Creator creator(long id) {
        return db.query("SELECT * FROM creators WHERE id=?",CREATOR,id).stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Creator não encontrado."));
    }
    Quote quote(long cents) {
        if(cents<100 || cents>100000000) throw bad("O investimento deve estar entre R$ 1 e R$ 1.000.000.");
        long commission = BigDecimal.valueOf(cents).multiply(new BigDecimal("0.30")).setScale(0,RoundingMode.HALF_UP).longValueExact();
        return new Quote(cents,commission,commissionMode.equals("INCLUDED") ? cents-commission : cents,
            commissionMode.equals("INCLUDED") ? cents : cents+commission,commissionMode);
    }
    @Transactional
    Deal create(String brand, CreateDeal input) {
        creator(input.creatorId());
        var q=quote(input.budgetCents()); var id=UUID.randomUUID().toString(); var now=Instant.now().toString();
        try {
            db.update("INSERT INTO deals(id,brand_id,creator_id,budget_cents,commission_cents,execution_cents,total_cents,commission_mode,match_mode,status,brief,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                id,brand,input.creatorId(),q.budgetCents(),q.commissionCents(),q.executionCents(),q.totalCents(),commissionMode,matchMode,"REQUESTED",input.brief().trim(),now,now);
        } catch(DuplicateKeyException e) { throw new ResponseStatusException(HttpStatus.CONFLICT,"Já existe uma negociação com este creator."); }
        event(id,brand,"REQUESTED","Marca demonstrou interesse. Aguardando intermediação GoInsiders.");
        return deal(id);
    }
    List<Deal> deals(String user, String role) {
        String query="SELECT id FROM deals";
        Object[] params={};
        if(role.equals("BRAND")) { query+=" WHERE brand_id=?";params=new Object[]{user}; }
        if(role.equals("CREATOR")) { query+=" WHERE creator_id=? AND match_mode='DOUBLE_OPT_IN' AND status <> 'REQUESTED'";params=new Object[]{1L}; }
        return db.queryForList(query+" ORDER BY created_at DESC",String.class,params).stream().map(this::deal).toList();
    }
    Deal deal(String id) {
        return db.query("SELECT * FROM deals WHERE id=?",(r,n) -> new Deal(r.getString("id"),r.getString("brand_id"),creator(r.getLong("creator_id")),
            r.getLong("budget_cents"),r.getLong("commission_cents"),r.getLong("execution_cents"),r.getLong("total_cents"),
            r.getString("commission_mode"),r.getString("match_mode"),r.getString("status"),r.getString("brief"),r.getString("owner"),
            r.getString("created_at"),r.getString("updated_at"),db.query("SELECT * FROM deal_events WHERE deal_id=? ORDER BY created_at,id",
                (e,i)->new Event(e.getString("actor"),e.getString("status"),e.getString("note"),e.getString("created_at")),id)),id)
            .stream().findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Negociação não encontrada."));
    }
    void lock(String id) { if(db.queryForList("SELECT id FROM deals WHERE id=? FOR UPDATE",String.class,id).isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Negociação não encontrada."); }
    @Transactional
    Deal update(String id, String actor, UpdateDeal input) {
        lock(id); var d=deal(id);
        Map<String,Set<String>> transitions=Map.of(
            "REQUESTED",Set.of("CONTACTING","CANCELLED"),
            "CONTACTING", d.matchMode().equals("MEDIATED") ? Set.of("ACCEPTED","DECLINED","CANCELLED") : Set.of("AWAITING_CREATOR","CANCELLED"),
            "AWAITING_CREATOR",Set.of("CANCELLED"), "ACCEPTED",Set.of("NEGOTIATING","CANCELLED"),
            "NEGOTIATING",Set.of("CLOSED","CANCELLED"));
        if(!transitions.getOrDefault(d.status(),Set.of()).contains(input.status())) throw bad("Transição de etapa inválida.");
        db.update("UPDATE deals SET status=?,owner=?,updated_at=? WHERE id=?",input.status(),input.owner().trim(),Instant.now().toString(),id);
        event(id,actor,input.status(),input.note().trim()); return deal(id);
    }
    @Transactional
    Deal decide(String id, String actor, Decision input) {
        lock(id); var d=deal(id);
        // The pilot account creator is explicitly linked to creator 1. Replace with user/creator relationship for onboarding.
        if(d.creator().id()!=1L) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Este convite pertence a outro creator.");
        if(!d.matchMode().equals("DOUBLE_OPT_IN") || !d.status().equals("AWAITING_CREATOR")) throw bad("Este convite não aguarda aceite no app.");
        String status=input.accepted()?"ACCEPTED":"DECLINED";
        db.update("UPDATE deals SET status=?,updated_at=? WHERE id=?",status,Instant.now().toString(),id);
        event(id,actor,status,input.note().trim());return deal(id);
    }
    void event(String id,String actor,String status,String note) {
        db.update("INSERT INTO deal_events(id,deal_id,actor,status,note,created_at) VALUES(?,?,?,?,?,?)",UUID.randomUUID().toString(),id,actor,status,note,Instant.now().toString());
    }
    static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
}
