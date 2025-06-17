export default {
  auth: {
    title: 'Portal do Funcionário',
    description: 'Digite seu endereço de e-mail para receber uma senha única.',
    options: 'Mais opções',
    email: {
      otp_sent: 'Senha única enviada',
      otp_description: 'Verifique seu e-mail para a senha única',
      otp_try_again: 'Tentar novamente',
      placeholder: 'Seu e-mail profissional',
      button: 'Continuar',
    },
  },
  powered_by: {
    title: 'Comp AI - Plataforma de Conformidade OSS',
    description:
      'Obtenha conformidade com SOC 2, ISO 27001 e GDPR em semanas, não meses. Código aberto, cadastro instantâneo, teste gratuito.',
    learn_more: 'Comece o Teste Gratuito e Obtenha Conformidade',
    learn_more_link: 'https://trycomp.ai',
  },
  user_menu: {
    theme: 'Tema',
    language: 'Idioma',
    sign_out: 'Sair',
  },
  not_found: {
    title: 'Não Encontrado',
    description: 'A página que você está procurando não existe.',
    return: 'Voltar para a página inicial',
  },
  sidebar: {
    dashboard: 'Visão Geral do Portal do Funcionário',
  },
  language: {
    placeholder: 'Selecionar Idioma',
  },
  theme: {
    options: {
      dark: 'Escuro',
      light: 'Claro',
      system: 'Sistema',
    },
  },
} as const;
