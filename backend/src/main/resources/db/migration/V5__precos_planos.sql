-- Ajuste comercial dos preços (sem usuários ativos ainda).
-- Básico: R$ 29,90/mês (1 certame, sem tutor).
-- Plus: R$ 59,90/mês (3 certames + Tutor de IA).
UPDATE planos SET valor_centavos = 2990, ciclo = 'MENSAL', nome = 'Básico' WHERE codigo = 'BASICO';
UPDATE planos SET valor_centavos = 5990, ciclo = 'MENSAL', nome = 'Plus' WHERE codigo = 'PLUS';
