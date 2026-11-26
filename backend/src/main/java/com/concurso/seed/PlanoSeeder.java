package com.concurso.seed;

import com.concurso.domain.Plano;
import com.concurso.repo.PlanoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Garante o catálogo de planos no primeiro boot.
 *
 * <p>Roda antes do seed de questões. Idempotente: só cria o que não existe pelo código do plano,
 * então ajustar preço depois é feito por migração/SQL, não aqui.</p>
 */
@Component
@Order(1)
public class PlanoSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PlanoSeeder.class);

    private final PlanoRepository planos;

    public PlanoSeeder(PlanoRepository planos) {
        this.planos = planos;
    }

    @Override
    public void run(ApplicationArguments args) {
        criar(Plano.FREE, "Gratuito", 0, null, 20);
        criar(Plano.PRO_MENSAL, "PRO mensal", 2990, "MENSAL", -1);
        criar(Plano.PRO_ANUAL, "PRO anual", 24990, "ANUAL", -1);
    }

    private void criar(String codigo, String nome, int valorCentavos, String ciclo, int limite) {
        if (planos.findByCodigo(codigo).isPresent()) {
            return;
        }
        Plano plano = new Plano();
        plano.setCodigo(codigo);
        plano.setNome(nome);
        plano.setValorCentavos(valorCentavos);
        plano.setCiclo(ciclo);
        plano.setLimiteDiarioQuestoes(limite);
        plano.setAtivo(true);
        planos.save(plano);
        log.info("Plano criado: {} ({} centavos, limite {})", codigo, valorCentavos, limite);
    }
}
