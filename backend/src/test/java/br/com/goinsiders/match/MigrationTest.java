package br.com.goinsiders.match;

import static org.assertj.core.api.Assertions.assertThat;
import java.sql.DriverManager;
import java.nio.charset.StandardCharsets;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

class MigrationTest {
    @Test void adoptsExistingPilotDatabaseWithoutLosingProfiles() throws Exception {
        String url = "jdbc:h2:mem:migrationtest;MODE=PostgreSQL;DB_CLOSE_DELAY=-1";
        try (var connection = DriverManager.getConnection(url, "sa", "");
             var statement = connection.createStatement();
             var stream = getClass().getResourceAsStream("/db/migration/V1__initial_schema.sql")) {
            String schema = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            for (var sql : schema.split(";")) if (!sql.isBlank()) statement.execute(sql);
            statement.execute("INSERT INTO creators VALUES(99,'Perfil preservado','@teste','Moda','Vestuário','SP','São Paulo',1000,5,'Bio','rose')");
        }
        var flyway = Flyway.configure().dataSource(url, "sa", "").baselineOnMigrate(true).baselineVersion("1").load();
        flyway.migrate();
        assertThat(flyway.info().current().getVersion().toString()).isEqualTo("2");
        try (var connection = DriverManager.getConnection(url, "sa", "");
             var query = connection.createStatement().executeQuery("SELECT name FROM creators WHERE id=99")) {
            assertThat(query.next()).isTrue(); assertThat(query.getString(1)).isEqualTo("Perfil preservado");
        }
        assertThat(flyway.migrate().migrationsExecuted).isZero();
    }
}
