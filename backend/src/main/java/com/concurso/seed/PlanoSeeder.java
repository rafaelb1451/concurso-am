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
        // Em bases de dev que ainda nao rodaram a V4, renomeia em vez de criar um plano duplicado.
        migrarCodigoAntigo(Plano.PRO_MENSAL, Plano.BASICO, "Básico", 1, false, 0);
        migrarCodigoAntigo(Plano.PRO_ANUAL, Plano.PLUS, "Plus", 3, true, 50);

        // FREE e' a amostra: sem escopo por certame e sem Tutor de IA.
        criar(Plano.FREE, "Gratuito", 0, null, 20, 0, false, 0);
        // Básico: exatamente 1 certame, sem tutor.
        criar(Plano.BASICO, "Básico", 2990, "MENSAL", -1, 1, false, 0);
        // Plus: ate 3 certames + Tutor de IA com cota diaria.
        criar(Plano.PLUS, "Plus", 4990, "MENSAL", -1, 3, true, 50);
    }

    /**
     * Converte os codigos comerciais antigos preservando a linha (e portanto as assinaturas que
     * apontam para ela). Nao altera preco nem ciclo: quem ja assinava mantem o valor contratado.
     */
    private void migrarCodigoAntigo(String antigo, String novo, String nome,
                                    int certamesMaximos, boolean tutorIa, int cotaTutorDiaria) {
        var existente = planos.findByCodigo(antigo);
        if (existente.isEmpty() || planos.findByCodigo(novo).isPresent()) {
            return;
        }
        Plano plano = existente.get();
        plano.setCodigo(novo);
        plano.setNome(nome);
        plano.setCertamesMaximos(certamesMaximos);
        plano.setTutorIa(tutorIa);
        plano.setCotaTutorDiaria(cotaTutorDiaria);
        planos.save(plano);
        log.info("Plano {} migrado para {}.", antigo, novo);
    }

    private void criar(String codigo, String nome, int valorCentavos, String ciclo, int limite,
                       int certamesMaximos, boolean tutorIa, int cotaTutorDiaria) {
        if (planos.findByCodigo(codigo).isPresent()) {
            return;
        }
        Plano plano = new Plano();
        plano.setCodigo(codigo);
        plano.setNome(nome);
        plano.setValorCentavos(valorCentavos);
        plano.setCiclo(ciclo);
        plano.setLimiteDiarioQuestoes(limite);
        plano.setCertamesMaximos(certamesMaximos);
        plano.setTutorIa(tutorIa);
        plano.setCotaTutorDiaria(cotaTutorDiaria);
        plano.setAtivo(true);
        planos.save(plano);
        log.info("Plano criado: {} ({} centavos, limite {}, certames {}, tutor {})",
                codigo, valorCentavos, limite, certamesMaximos, tutorIa);
    }
}
