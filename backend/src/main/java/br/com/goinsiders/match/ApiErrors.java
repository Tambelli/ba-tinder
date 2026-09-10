package br.com.goinsiders.match;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
class ApiErrors {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> status(ResponseStatusException e) {return ResponseEntity.status(e.getStatusCode()).body(Map.of("message",ObjectsMessage(e)));}
    private String ObjectsMessage(ResponseStatusException e) {return e.getReason()==null?"Não foi possível concluir a operação.":e.getReason();}
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validation(MethodArgumentNotValidException e) {return ResponseEntity.badRequest().body(Map.of("message","Revise os campos: investimento válido, briefing e observações obrigatórios dentro do limite de caracteres."));}
}
