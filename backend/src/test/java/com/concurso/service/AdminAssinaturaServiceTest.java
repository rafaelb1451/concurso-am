package com.concurso.service;

import com.concurso.domain.Assinatura;
import com.concurso.domain.EventoPagamento;
import com.concurso.domain.Plano;
import com.concurso.domain.StatusAssinatura;
import com.concurso.domain.Usuario;
import com.concurso.repo.AssinaturaRepository;
import com.concurso.repo.EventoPagamentoRepository;
import com.concurso.repo.PlanoRepository;
import com.concurso.repo.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.json.JsonMapper;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Concessão/revogação manual de PRO (painel admin) com auditoria. */
@ExtendWith(MockitoExtension.class)
class AdminAssinaturaServiceTest {

    @Mock private UsuarioRepository usuarios;
    @Mock private PlanoRepository planos;
    @Mock private AssinaturaRepository assinaturas;
    @Mock private EventoPagamentoRepository eventos;

    private AdminAssinaturaService service;

    @BeforeEach
    void setUp() {
        service = new AdminAssinaturaService(usuarios, planos, assinaturas, eventos,
                JsonMapper.builder().build());
        Usuario u = new Usuario();
        u.setId(2L);
        u.setNome("Rafael");
        u.setEmail("rafa@teste.com");
        lenient().when(usuarios.findByEmail("rafa@teste.com")).thenReturn(Optional.of(u));

        Plano mensal = new Plano();
        mensal.setCodigo("PRO_MENSAL");
        mensal.setNome("PRO mensal");
        mensal.setCiclo("MENSAL");
        mensal.setValorCentavos(2990);
        lenient().when(planos.findByCodigo("PRO_MENSAL")).thenReturn(Optional.of(mensal));
    }

    @Test
    @DisplayName("concede PRO com prazo e grava auditoria")
    void concedeComAuditoria() {
        when(assinaturas.findFirstByUsuarioIdOrderByCriadaEmDesc(2L)).thenReturn(Optional.empty());
        when(assinaturas.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Assinatura a = service.conceder("rafa@teste.com", "PRO_MENSAL", 30, 1L);

        assertThat(a.getStatus()).isEqualTo(StatusAssinatura.ATIVA);
        assertThat(a.getGateway()).isEqualTo("manual");
        assertThat(a.liberaPro()).isTrue();
        assertThat(Duration.between(Instant.now(), a.getPeriodoFim()).toDays()).isBetween(29L, 30L);
        verify(eventos).save(any(EventoPagamento.class));
    }

    @Test
    @DisplayName("revoga o acesso na hora e grava auditoria")
    void revogaComAuditoria() {
        Assinatura ativa = new Assinatura();
        ativa.setUsuarioId(2L);
        ativa.setPlanoId(2L);
        ativa.setStatus(StatusAssinatura.ATIVA);
        ativa.setPeriodoFim(Instant.now().plusSeconds(86400));
        when(assinaturas.findFirstByUsuarioIdOrderByCriadaEmDesc(2L)).thenReturn(Optional.of(ativa));
        when(assinaturas.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Assinatura a = service.revogar("rafa@teste.com", 1L);

        assertThat(a.getStatus()).isEqualTo(StatusAssinatura.EXPIRADA);
        assertThat(a.liberaPro()).isFalse();
        verify(eventos).save(any(EventoPagamento.class));
    }

    @Test
    @DisplayName("usuário inexistente é recusado")
    void usuarioInexistente() {
        when(usuarios.findByEmail("nao@existe.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.conceder("nao@existe.com", "PRO_MENSAL", 30, 1L))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("prazo inválido é recusado")
    void prazoInvalido() {
        assertThatThrownBy(() -> service.conceder("rafa@teste.com", "PRO_MENSAL", 0, 1L))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
