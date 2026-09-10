package br.com.goinsiders.match;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static br.com.goinsiders.match.Models.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(properties={"app.demo=true","spring.datasource.url=jdbc:h2:mem:matchtest;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"})
@AutoConfigureMockMvc
@Transactional
class MatchIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired MatchService service;
    @Autowired JdbcTemplate db;
    @Test void anonymousCannotReadAndMutationsRequireCsrf() throws Exception {
        mvc.perform(get("/api/deals")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/deals").with(user("marca").roles("BRAND")).contentType(MediaType.APPLICATION_JSON)
            .content("{\"creatorId\":1,\"budgetCents\":1000000,\"brief\":\"Nova linha de beleza\"}"))
            .andExpect(status().isForbidden());
    }
    @Test void sessionLoginAcceptsValidCredentialsAndRejectsWrongPassword() throws Exception {
        mvc.perform(post("/api/login").with(csrf()).param("username","marca").param("password","demo-marca-2026")).andExpect(status().isNoContent());
        mvc.perform(post("/api/login").with(csrf()).param("username","marca").param("password","errada")).andExpect(status().isUnauthorized());
    }
    @Test void combinedFiltersAndInvalidRanges() throws Exception {
        mvc.perform(get("/api/creators").with(user("marca").roles("BRAND"))
            .param("productNiche","Beleza").param("creatorNiche","Lifestyle").param("state","SP")
            .param("minFollowers","100000").param("maxFollowers","150000").param("minEngagement","5").param("maxEngagement","6"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].id").value(1));
        mvc.perform(get("/api/creators").with(user("marca")).param("minFollowers","100").param("maxFollowers","1")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/creators").with(user("marca")).param("minEngagement","NaN")).andExpect(status().isBadRequest());
    }
    @Test void commissionUsesExactCentsAndSnapshotsPolicy() {
        var q=service.quote(1000000);assertThat(q.commissionCents()).isEqualTo(300000);assertThat(q.executionCents()).isEqualTo(700000);assertThat(q.totalCents()).isEqualTo(1000000);
        assertThat(service.quote(105).commissionCents()).isEqualTo(32);
        var added=new MatchService(db,new MockEnvironment().withProperty("app.commission-mode","ADDED"));
        assertThat(added.quote(1000000).totalCents()).isEqualTo(1300000);
        assertThat(added.quote(1000000).executionCents()).isEqualTo(1000000);
        assertThatThrownBy(()->service.quote(-1)).isInstanceOf(ResponseStatusException.class);
        var d=added.create("marca",new CreateDeal(1,1000000,"Parceria"));
        assertThat(service.deal(d.id()).commissionMode()).isEqualTo("ADDED");
        assertThat(service.deal(d.id()).totalCents()).isEqualTo(1300000);
    }
    @Test void brandCreatesOnceAndCannotManageOrSeeAnotherBrand() throws Exception {
        String body="{\"creatorId\":1,\"budgetCents\":1000000,\"brief\":\"Lançamento da linha de beleza\"}";
        mvc.perform(post("/api/deals").with(user("marca").roles("BRAND")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REQUESTED")).andExpect(jsonPath("$.commissionCents").value(300000));
        mvc.perform(post("/api/deals").with(user("marca").roles("BRAND")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isConflict());
        mvc.perform(get("/api/deals").with(user("outra-marca").roles("BRAND"))).andExpect(jsonPath("$.length()").value(0));
        String id=service.deals("marca","BRAND").getFirst().id();
        mvc.perform(patch("/api/ops/deals/"+id).with(user("marca").roles("BRAND")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"CLOSED\",\"owner\":\"Ana\",\"note\":\"Fechado\"}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/deals").with(user("operacao").roles("OPS")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isForbidden());
    }
    @Test void validatesBudgetBriefAndCreator() throws Exception {
        for(String body:new String[]{"{\"creatorId\":1,\"budgetCents\":0,\"brief\":\"Teste\"}","{\"creatorId\":1,\"budgetCents\":100,\"brief\":\"   \"}"})
            mvc.perform(post("/api/deals").with(user("marca").roles("BRAND")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/deals").with(user("marca").roles("BRAND")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"creatorId\":999,\"budgetCents\":100,\"brief\":\"Teste\"}")).andExpect(status().isNotFound());
    }
    @Test void mediatedFlowRequiresOrderedStagesAndKeepsAudit() {
        var d=service.create("marca",new CreateDeal(2,1000000,"Campanha esportiva"));
        assertThatThrownBy(()->service.update(d.id(),"operacao",new UpdateDeal("CLOSED","Ana","Fechado"))).isInstanceOf(ResponseStatusException.class);
        for(String stage:new String[]{"CONTACTING","ACCEPTED","NEGOTIATING","CLOSED"}) service.update(d.id(),"operacao",new UpdateDeal(stage,"Ana","Registro da etapa "+stage));
        var closed=service.deal(d.id());assertThat(closed.status()).isEqualTo("CLOSED");assertThat(closed.events()).hasSize(5);assertThat(closed.owner()).isEqualTo("Ana");
        assertThatThrownBy(()->service.update(d.id(),"operacao",new UpdateDeal("CONTACTING","Ana","Reabrir"))).isInstanceOf(ResponseStatusException.class);
    }
    @Test void doubleOptInRequiresCreatorAndScopesInvites() throws Exception {
        var doubleService=new MatchService(db,new MockEnvironment().withProperty("app.match-mode","DOUBLE_OPT_IN"));
        var d=doubleService.create("marca",new CreateDeal(1,10000,"Convite"));
        service.update(d.id(),"operacao",new UpdateDeal("CONTACTING","Ana","Início do contato"));
        assertThatThrownBy(()->service.update(d.id(),"operacao",new UpdateDeal("ACCEPTED","Ana","Aceite"))).isInstanceOf(ResponseStatusException.class);
        service.update(d.id(),"operacao",new UpdateDeal("AWAITING_CREATOR","Ana","Convite pronto"));
        mvc.perform(post("/api/creator/deals/"+d.id()+"/decision").with(user("creator").roles("CREATOR")).with(csrf())
            .contentType(MediaType.APPLICATION_JSON).content("{\"accepted\":true,\"note\":\"Tenho interesse\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACCEPTED"));
        var other=doubleService.create("marca",new CreateDeal(2,10000,"Outro creator"));
        mvc.perform(post("/api/creator/deals/"+other.id()+"/decision").with(user("creator").roles("CREATOR")).with(csrf())
            .contentType(MediaType.APPLICATION_JSON).content("{\"accepted\":true,\"note\":\"Tentativa\"}"))
            .andExpect(status().isForbidden());
        assertThat(service.deals("creator","CREATOR")).hasSize(1);
    }
}
