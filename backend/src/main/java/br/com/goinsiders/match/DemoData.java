package br.com.goinsiders.match;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name="app.demo",havingValue="true")
class DemoData implements CommandLineRunner {
    private final JdbcTemplate db;
    DemoData(JdbcTemplate db) {this.db=db;}
    public void run(String... args) {
        Object[][] creators={
            {1L,"Marina Costa","@marina.exemplo","Lifestyle","Beleza","SP","São Paulo",128000L,5.8,"Rotina real, beleza consciente e conversas que aproximam. Conteúdo leve com uma comunidade que participa.","rose"},
            {2L,"Lucas Ribeiro","@lucas.exemplo","Fitness","Esporte","RJ","Rio de Janeiro",86000L,6.2,"Movimento para todos os dias. Treinos acessíveis, corrida de rua e histórias de quem está começando.","lime"},
            {3L,"Beatriz Lima","@bia.exemplo","Gastronomia","Alimentos","MG","Belo Horizonte",214000L,4.9,"Receitas com afeto, ingredientes locais e descobertas à mesa. Conecto marcas a boas histórias.","orange"},
            {4L,"Rafael Souza","@rafa.exemplo","Tecnologia","Eletrônicos","SP","Campinas",67000L,7.1,"Tecnologia explicada sem complicar. Reviews, ferramentas e ideias úteis para a vida digital.","blue"},
            {5L,"Camila Rocha","@cami.exemplo","Moda","Vestuário","PR","Curitiba",152000L,5.3,"Estilo pessoal e escolhas mais conscientes. Produção criativa para marcas com personalidade.","purple"},
            {6L,"Pedro Alves","@pedro.exemplo","Viagem","Turismo","SC","Florianópolis",94000L,4.7,"Viagens possíveis, trilhas e destinos fora do óbvio. Uma comunidade curiosa para descobrir o Brasil.","teal"},
            {7L,"Juliana Melo","@ju.exemplo","Lifestyle","Beleza","RJ","Niterói",43000L,8.2,"Autocuidado sem filtros e dicas que cabem no dia a dia. Minha comunidade conversa, testa e compartilha.","rose"},
            {8L,"André Santos","@andre.exemplo","Gastronomia","Alimentos","BA","Salvador",178000L,5.6,"Sabores da Bahia e encontros pela cozinha. Conteúdo que valoriza ingredientes e pessoas.","orange"}
        };
        for(var c:creators) if(db.queryForObject("SELECT COUNT(*) FROM creators WHERE id=?",Integer.class,c[0])==0)
            db.update("INSERT INTO creators(id,name,handle,creator_niche,product_niche,state,city,followers,engagement,bio,color) VALUES(?,?,?,?,?,?,?,?,?,?,?)",c);
    }
}
