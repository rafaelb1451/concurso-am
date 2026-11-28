package com.concurso.service;

import com.concurso.domain.Concursos;
import com.concurso.domain.Plano;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Validacao server-side dos certames escolhidos no checkout/troca.
 *
 * <p>Nunca confia no frontend: normaliza o codigo, recusa formato invalido, remove repetidos e
 * aplica o limite do plano. O Básico tem {@code certamesMaximos = 1} (exatamente um); o Plus
 * aceita de 1 a 3.</p>
 */
public final class RegrasCertame {

    private RegrasCertame() {
    }

    /**
     * @return lista normalizada, sem repetidos, na ordem enviada
     * @throws IllegalArgumentException quando a quantidade/formato nao respeita o plano
     */
    public static List<String> validar(Plano plano, Collection<String> pedidos) {
        List<String> normalizados = new ArrayList<>();
        Set<String> vistos = new LinkedHashSet<>();
        if (pedidos != null) {
            for (String pedido : pedidos) {
                String codigo = Concursos.normalizar(pedido);
                if (codigo == null) {
                    continue;
                }
                if (!Concursos.valido(codigo)) {
                    throw new IllegalArgumentException(
                            "Certame inválido: use códigos como PM-AM, PC-AM ou CREA-AM.");
                }
                if (vistos.add(codigo)) {
                    normalizados.add(codigo);
                }
            }
        }

        int maximo = plano.getCertamesMaximos();
        if (maximo <= 0) {
            throw new IllegalArgumentException("O plano " + plano.getNome() + " não inclui certames.");
        }
        if (normalizados.isEmpty()) {
            throw new IllegalArgumentException("Escolha pelo menos 1 certame para o plano "
                    + plano.getNome() + ".");
        }
        if (maximo == 1 && normalizados.size() != 1) {
            throw new IllegalArgumentException("O plano " + plano.getNome()
                    + " permite exatamente 1 certame.");
        }
        if (normalizados.size() > maximo) {
            throw new IllegalArgumentException("O plano " + plano.getNome()
                    + " permite no máximo " + maximo + " certames.");
        }
        return List.copyOf(normalizados);
    }

    /** Normaliza para comparacao (maiusculo, sem espacos). */
    public static String normalizar(String concurso) {
        String codigo = Concursos.normalizar(concurso);
        return codigo == null ? null : codigo.toUpperCase(Locale.ROOT);
    }
}
