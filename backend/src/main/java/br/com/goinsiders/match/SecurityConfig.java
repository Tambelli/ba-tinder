package br.com.goinsiders.match;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean UserDetailsService users(Environment env, PasswordEncoder encoder) {
        boolean demo = env.getProperty("app.demo", Boolean.class, false);
        var users = new InMemoryUserDetailsManager();
        String[][] accounts = {{"marca", "BRAND", "brand"}, {"operacao", "OPS", "ops"}, {"creator", "CREATOR", "creator"}};
        for (var account : accounts) {
            String password = env.getProperty("app." + account[2] + "-password", "");
            if (password.isBlank() && demo) password = "demo-" + account[0] + "-2026";
            if (password.length() < 12) throw new IllegalStateException("Configure uma senha de pelo menos 12 caracteres para " + account[0] + ", ou habilite APP_DEMO somente localmente.");
            users.createUser(User.withUsername(account[0]).password(encoder.encode(password)).roles(account[1]).build());
        }
        return users;
    }

    @Bean SecurityFilterChain security(HttpSecurity http) throws Exception {
        // Browser uses a server session plus CSRF token. Passwords are never stored by the frontend.
        return http.authorizeHttpRequests(auth -> auth
            .requestMatchers("/", "/index.html", "/assets/**", "/favicon.svg", "/api/session", "/api/login").permitAll()
            .requestMatchers("/api/ops/**").hasRole("OPS")
            .requestMatchers("/api/creator/**").hasRole("CREATOR")
            .requestMatchers(HttpMethod.POST, "/api/deals").hasRole("BRAND")
            .requestMatchers("/api/**").authenticated()
            .anyRequest().denyAll())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .formLogin(form -> form.loginProcessingUrl("/api/login")
                .successHandler((req,res,a) -> res.setStatus(204))
                .failureHandler((req,res,e) -> res.sendError(401)))
            .logout(out -> out.logoutUrl("/api/logout").logoutSuccessHandler((req,res,a) -> res.setStatus(204)))
            .exceptionHandling(e -> e.authenticationEntryPoint((req,res,x) -> res.sendError(401)))
            .csrf(Customizer.withDefaults()).build();
    }
}
