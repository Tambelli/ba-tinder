package br.com.goinsiders.match;

import static br.com.goinsiders.match.Models.*;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.core.env.Environment;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
class ApiController {
    private final MatchService service;
    private final boolean demo;
    ApiController(MatchService service,Environment env) {this.service=service;demo=env.getProperty("app.demo",Boolean.class,false);}
    @GetMapping("/session") Map<String,Object> session(Authentication auth,CsrfToken csrf) {
        return Map.of("authenticated",auth!=null,"username",auth==null?"":auth.getName(),"role",auth==null?"":role(auth),
            "csrfToken",csrf.getToken(),"demo",demo,"matchMode",service.matchMode(),"commissionMode",service.commissionMode());
    }
    @GetMapping("/creators") List<Creator> creators(@RequestParam(required=false) String productNiche,@RequestParam(required=false) String creatorNiche,
        @RequestParam(required=false) String state,@RequestParam(defaultValue="0") long minFollowers,@RequestParam(defaultValue="1000000000") long maxFollowers,
        @RequestParam(defaultValue="0") double minEngagement,@RequestParam(defaultValue="100") double maxEngagement) {
        return service.creators(productNiche,creatorNiche,state,minFollowers,maxFollowers,minEngagement,maxEngagement);
    }
    @GetMapping("/quote") Quote quote(@RequestParam long budgetCents) {return service.quote(budgetCents);}
    @GetMapping("/deals") List<Deal> deals(Authentication auth) {return service.deals(auth.getName(),role(auth));}
    @PostMapping("/deals") Deal create(Authentication auth,@Valid @RequestBody CreateDeal input) {return service.create(auth.getName(),input);}
    @PatchMapping("/ops/deals/{id}") Deal update(Authentication auth,@PathVariable String id,@Valid @RequestBody UpdateDeal input) {return service.update(id,auth.getName(),input);}
    @PostMapping("/creator/deals/{id}/decision") Deal decide(Authentication auth,@PathVariable String id,@Valid @RequestBody Decision input) {return service.decide(id,auth.getName(),input);}
    static String role(Authentication auth) {return auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_","");}
}
