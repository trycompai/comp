export default {
  languages: {
    es: "Espanhol",
    fr: "Francês",
    no: "Norueguês",
    pt: "Português",
    en: "Inglês"
  },
  language: {
    title: "Idiomas",
    description: "Altere o idioma usado na interface do usuário.",
    placeholder: "Selecione o idioma"
  },
  common: {
    actions: {
      save: "Salvar",
      edit: "Editar",
      "delete": "Excluir",
      cancel: "Cancelar",
      clear: "Limpar",
      create: "Criar",
      send: "Enviar",
      "return": "Retornar",
      success: "Sucesso",
      error: "Erro",
      next: "Próximo",
      complete: "Completo",
      addNew: "Adicionar Novo"
    },
    assignee: {
      label: "Responsável",
      placeholder: "Selecione o responsável"
    },
    date: {
      pick: "Escolher uma data",
      due_date: "Data de Vencimento"
    },
    status: {
      open: "Aberto",
      pending: "Pendente",
      closed: "Fechado",
      archived: "Arquivado",
      compliant: "Conforme",
      non_compliant: "Não Conforme",
      not_started: "Não Iniciado",
      in_progress: "Em Andamento",
      published: "Publicado",
      needs_review: "Necessita Revisão",
      draft: "Rascunho",
      not_assessed: "Não Avaliado",
      assessed: "Avaliado",
      active: "Ativo",
      inactive: "Inativo",
      title: "Status"
    },
    filters: {
      clear: "Limpar filtros",
      search: "Pesquisar...",
      status: "Status",
      department: "Departamento",
      owner: {
        label: "Responsável",
        placeholder: "Filtrar por responsável"
      }
    },
    table: {
      title: "Título",
      status: "Status",
      assigned_to: "Atribuído A",
      due_date: "Data de Vencimento",
      last_updated: "Última Atualização",
      no_results: "Nenhum resultado encontrado"
    },
    empty_states: {
      no_results: {
        title: "Nenhum resultado encontrado",
        title_tasks: "Nenhuma tarefa encontrada",
        title_risks: "Nenhum risco encontrado",
        description: "Tente outra pesquisa ou ajuste os filtros",
        description_filters: "Tente outra pesquisa ou ajuste os filtros",
        description_no_tasks: "Crie uma tarefa para começar",
        description_no_risks: "Crie um risco para começar"
      },
      no_items: {
        title: "Nenhum item encontrado",
        description: "Tente ajustar sua pesquisa ou filtros"
      }
    },
    pagination: {
      of: "de",
      items_per_page: "Itens por página",
      rows_per_page: "Linhas por página",
      page_x_of_y: "Página {{current}} de {{total}}",
      go_to_first_page: "Ir para a primeira página",
      go_to_previous_page: "Ir para a página anterior",
      go_to_next_page: "Ir para a próxima página",
      go_to_last_page: "Ir para a última página"
    },
    comments: {
      title: "Comentários",
      description: "Adicione um comentário usando o formulário abaixo.",
      add: "Novo Comentário",
      "new": "Novo Comentário",
      save: "Salvar Comentário",
      success: "Comentário adicionado com sucesso",
      error: "Falha ao adicionar comentário",
      placeholder: "Escreva seu comentário aqui...",
      empty: {
        title: "Nenhum comentário ainda",
        description: "Seja o primeiro a adicionar um comentário"
      }
    },
    attachments: {
      title: "Anexos",
      description: "Adicione um arquivo clicando em 'Adicionar Anexo'.",
      upload: "Enviar anexo",
      upload_description: "Carregue um anexo ou adicione um link para um recurso externo.",
      drop: "Solte os arquivos aqui",
      drop_description: "Solte arquivos aqui ou clique para escolher arquivos do seu dispositivo.",
      drop_files_description: "Os arquivos podem ter até ",
      empty: {
        title: "Nenhum anexo",
        description: "Adicione um arquivo clicando em 'Adicionar Anexo'."
      },
      toasts: {
        error: "Algo deu errado, por favor tente novamente.",
        error_uploading_files: "Não é possível carregar mais de 1 arquivo por vez",
        error_uploading_files_multiple: "Não é possível carregar mais de 10 arquivos",
        error_no_files_selected: "Nenhum arquivo selecionado",
        error_file_rejected: "Arquivo {file} foi rejeitado",
        error_failed_to_upload_files: "Falha ao carregar arquivos",
        error_failed_to_upload_files_multiple: "Falha ao carregar arquivos",
        error_failed_to_upload_files_single: "Falha ao carregar arquivo",
        success_uploading_files: "Arquivos carregados com sucesso",
        success_uploading_files_multiple: "Arquivos carregados com sucesso",
        success_uploading_files_single: "Arquivo carregado com sucesso",
        success_uploading_files_target: "Arquivos carregados",
        uploading_files: "Carregando {target}...",
        remove_file: "Remover arquivo"
      }
    },
    notifications: {
      inbox: "Caixa de entrada",
      archive: "Arquivo",
      archive_all: "Arquivar tudo",
      no_notifications: "Sem novas notificações"
    },
    edit: "Editar",
    errors: {
      unexpected_error: "Ocorreu um erro inesperado"
    },
    description: "Descrição",
    last_updated: "Última atualização",
    frequency: {
      daily: "Diário",
      weekly: "Semanal",
      monthly: "Mensal",
      quarterly: "Trimestral",
      yearly: "Anual"
    },
    upload: {
      fileUpload: {
        uploadingText: "Carregando...",
        uploadingFile: "Carregando arquivo...",
        dropFileHere: "Solte o arquivo aqui",
        dropFileHereAlt: "Solte o arquivo aqui",
        releaseToUpload: "Solte para carregar",
        addFiles: "Adicionar Arquivos",
        uploadAdditionalEvidence: "Carregue um arquivo ou documento",
        dragDropOrClick: "Arraste e solte ou clique para navegar",
        dragDropOrClickToSelect: "Arraste e solte ou clique para selecionar o arquivo",
        maxFileSize: "Tamanho máximo do arquivo: {size}MB"
      },
      fileUrl: {
        additionalLinks: "Links Adicionais",
        add: "Adicionar",
        linksAdded: "{count} link{s} adicionado{s}",
        enterUrl: "Digite a URL",
        addAnotherLink: "Adicionar Outro Link",
        saveLinks: "Salvar Links",
        urlBadge: "URL",
        copyLink: "Copiar Link",
        openLink: "Abrir Link",
        deleteLink: "Excluir Link"
      },
      fileCard: {
        preview: "Pré-visualização",
        filePreview: "Pré-visualização do Arquivo: {fileName}",
        previewNotAvailable: "Pré-visualização não disponível para este tipo de arquivo",
        openFile: "Abrir Arquivo",
        deleteFile: "Excluir Arquivo",
        deleteFileConfirmTitle: "Excluir Arquivo",
        deleteFileConfirmDescription: "Esta ação não pode ser desfeita. O arquivo será excluído permanentemente."
      },
      fileSection: {
        filesUploaded: "{count} arquivos carregados"
      }
    }
  },
  header: {
    discord: {
      button: "Junte-se a nós no Discord"
    },
    feedback: {
      button: "Feedback",
      title: "Obrigado pelo seu feedback!",
      description: "Voltaremos a você assim que possível",
      placeholder: "Ideias para melhorar esta página ou problemas que você está enfrentando.",
      success: "Obrigado pelo seu feedback!",
      error: "Erro ao enviar feedback - tentar novamente?",
      send: "Enviar Feedback"
    }
  },
  not_found: {
    title: "404 - Página não encontrada",
    description: "A página que você está procurando não existe.",
    "return": "Retornar ao painel"
  },
  theme: {
    options: {
      light: "Claro",
      dark: "Escuro",
      system: "Sistema"
    }
  },
  sidebar: {
    overview: "Visão Geral",
    policies: "Políticas",
    risk: "Gestão de Riscos",
    vendors: "Fornecedores",
    integrations: "Integrações",
    settings: "Configurações",
    evidence: "Tarefas de Evidência",
    people: "Pessoas",
    tests: "Testes em Nuvem"
  },
  auth: {
    title: "Automatize a conformidade com SOC 2, ISO 27001 e GDPR com IA.",
    description: "Crie uma conta gratuita ou faça login com uma conta existente para continuar.",
    options: "Mais opções",
    google: "Continuar com o Google",
    email: {
      description: "Insira seu endereço de e-mail para continuar.",
      placeholder: "Insira o endereço de e-mail",
      button: "Continuar com e-mail",
      magic_link_sent: "Link mágico enviado",
      magic_link_description: "Verifique sua caixa de entrada para um link mágico.",
      magic_link_try_again: "Tente novamente.",
      success: "E-mail enviado - verifique sua caixa de entrada!",
      error: "Erro ao enviar e-mail - tentar novamente?"
    },
    terms: "Ao clicar em continuar, você reconhece que leu e concorda com os Termos de Serviço e a Política de Privacidade."
  },
  onboarding: {
    title: "Criar uma organização",
    setup: "Bem-vindo ao Comp AI",
    description: "Conte-nos um pouco sobre sua organização e quais framework(s) você deseja começar a usar.",
    fields: {
      name: {
        label: "Nome da Organização",
        placeholder: "O nome da sua organização"
      },
      website: {
        label: "Website",
        placeholder: "O website da sua organização"
      },
      subdomain: {
        label: "Subdomínio",
        placeholder: "exemplo"
      },
      fullName: {
        label: "Seu Nome",
        placeholder: "Seu nome completo"
      }
    },
    success: "Obrigado, tudo pronto!",
    error: "Algo deu errado, por favor tente novamente.",
    unavailable: "Indisponível",
    check_availability: "Verificando disponibilidade",
    available: "Disponível",
    submit: "Finalizar configuração",
    trigger: {
      title: "Aguarde, estamos criando sua organização",
      creating: "Isso pode levar um ou dois minutos...",
      completed: "Organização criada com sucesso",
      "continue": "Continuar para o painel",
      error: "Algo deu errado, por favor, tente novamente."
    },
    creating: "Criando sua organização...",
    "switch": "Mudando de organização..."
  },
  overview: {
    title: "Visão Geral",
    framework_chart: {
      title: "Progresso do Framework"
    },
    requirement_chart: {
      title: "Status de Conformidade"
    }
  },
  policies: {
    dashboard: {
      title: "Painel",
      all: "Todas as Políticas",
      policy_status: "Política por Status",
      policies_by_assignee: "Políticas por Responsável",
      policies_by_framework: "Políticas por Framework",
      sub_pages: {
        overview: "Visão Geral",
        edit_policy: "Editar Política"
      }
    },
    table: {
      name: "Nome da Política",
      statuses: {
        draft: "Rascunho",
        published: "Publicado",
        archived: "Arquivado"
      },
      filters: {
        owner: {
          label: "Responsável",
          placeholder: "Filtrar por responsável"
        }
      }
    },
    filters: {
      search: "Pesquisar políticas...",
      all: "Todas as Políticas"
    },
    status: {
      draft: "Rascunho",
      published: "Publicado",
      needs_review: "Necessita Revisão",
      archived: "Arquivado",
      relevant: "Relevante",
      "not-relevant": "Não Relevante"
    },
    policies: "políticas",
    title: "Políticas",
    create_new: "Criar nova política",
    search_placeholder: "Pesquisar políticas...",
    status_filter: "Filtrar por status",
    all_statuses: "Todos os status",
    no_policies_title: "Nenhuma política ainda",
    no_policies_description: "Comece criando sua primeira política",
    create_first: "Criar primeira política",
    no_description: "Nenhuma descrição fornecida",
    last_updated: "Última atualização: {{date}}",
    save: "Salvar",
    saving: "Salvando...",
    saved_success: "Política salva com sucesso",
    saved_error: "Falha ao salvar a política",
    overview: {
      title: "Visão Geral da Política",
      form: {
        update_policy: "Atualizar Política",
        update_policy_description: "Atualize o título ou a descrição da política.",
        update_policy_success: "Política atualizada com sucesso",
        update_policy_error: "Falha ao atualizar a política",
        update_policy_title: "Nome da Política",
        review_frequency: "Frequência de Revisão",
        review_frequency_placeholder: "Selecione uma frequência de revisão",
        review_date: "Data da Revisão",
        review_date_placeholder: "Selecione uma data de revisão",
        required_to_sign: "Necessário ser assinado pelos funcionários",
        signature_required: "Exigir assinatura dos funcionários",
        signature_not_required: "Não peça para os funcionários assinarem",
        signature_requirement: "Requisito de Assinatura",
        signature_requirement_placeholder: "Selecionar requisito de assinatura"
      }
    },
    "new": {
      success: "Política criada com sucesso",
      error: "Falha ao criar a política",
      details: "Detalhes da Política",
      title: "Insira um título para a política",
      description: "Insira uma descrição para a política"
    }
  },
  evidence_tasks: {
    evidence_tasks: "Tarefas de Evidência",
    overview: "Visão Geral"
  },
  risk: {
    risks: "riscos",
    overview: "Visão Geral",
    create: "Criar Novo Risco",
    vendor: {
      title: "Gestão de Fornecedores",
      dashboard: {
        title: "Painel de Fornecedores",
        overview: "Visão Geral dos Fornecedores",
        vendor_status: "Status do Fornecedor",
        vendor_category: "Categorias de Fornecedor",
        vendors_by_assignee: "Fornecedores por Responsável",
        inherent_risk_description: "Nível de risco inicial antes da aplicação de quaisquer controles",
        residual_risk_description: "Nível de risco restante após a aplicação de controles"
      },
      register: {
        title: "Registro de Fornecedor",
        table: {
          name: "Nome",
          category: "Categoria",
          status: "Status",
          owner: "Responsável"
        }
      },
      assessment: {
        title: "Avaliação de Fornecedor",
        update_success: "Avaliação de risco do fornecedor atualizada com sucesso",
        update_error: "Falha ao atualizar a avaliação de risco do fornecedor",
        inherent_risk: "Risco Inerente",
        residual_risk: "Risco Residual"
      },
      form: {
        vendor_details: "Detalhes do Fornecedor",
        vendor_name: "Nome",
        vendor_name_placeholder: "Insira o nome do fornecedor",
        vendor_website: "Website",
        vendor_website_placeholder: "Insira o website do fornecedor",
        vendor_description: "Descrição",
        vendor_description_placeholder: "Insira a descrição do fornecedor",
        vendor_category: "Categoria",
        vendor_category_placeholder: "Selecione a categoria",
        vendor_status: "Status",
        vendor_status_placeholder: "Selecione o status",
        create_vendor_success: "Fornecedor criado com sucesso",
        create_vendor_error: "Falha ao criar fornecedor",
        update_vendor: "Atualizar Fornecedor",
        update_vendor_success: "Fornecedor atualizado com sucesso",
        update_vendor_error: "Falha ao atualizar fornecedor",
        add_comment: "Adicionar Comentário"
      },
      table: {
        name: "Nome",
        category: "Categoria",
        status: "Status",
        owner: "Proprietário"
      },
      filters: {
        search_placeholder: "Pesquisar fornecedores...",
        status_placeholder: "Filtrar por status",
        category_placeholder: "Filtrar por categoria",
        owner_placeholder: "Filtrar por proprietário"
      },
      empty_states: {
        no_vendors: {
          title: "Nenhum fornecedor ainda",
          description: "Comece criando seu primeiro fornecedor"
        },
        no_results: {
          title: "Nenhum resultado encontrado",
          description: "Nenhum fornecedor corresponde à sua pesquisa",
          description_with_filters: "Tente ajustar seus filtros"
        }
      },
      actions: {
        create: "Criar Fornecedor"
      },
      status: {
        not_assessed: "Não Avaliado",
        in_progress: "Em Andamento",
        assessed: "Avaliado"
      },
      category: {
        cloud: "Nuvem",
        infrastructure: "Infraestrutura",
        software_as_a_service: "Software como Serviço",
        finance: "Finanças",
        marketing: "Marketing",
        sales: "Vendas",
        hr: "RH",
        other: "Outro"
      },
      risk_level: {
        low: "Baixo Risco",
        medium: "Risco Médio",
        high: "Alto Risco",
        unknown: "Risco Desconhecido"
      }
    },
    dashboard: {
      title: "Painel",
      overview: "Visão Geral do Risco",
      risk_status: "Status do Risco",
      risks_by_department: "Riscos por Departamento",
      risks_by_assignee: "Riscos por Responsável",
      inherent_risk_description: "O risco inerente é calculado como probabilidade * impacto. Calculado antes de qualquer controle ser aplicado.",
      residual_risk_description: "O risco residual é calculado como probabilidade * impacto. Este é o nível de risco após a aplicação de controles.",
      risk_assessment_description: "Compare os níveis de risco inerente e residual"
    },
    register: {
      title: "Registro de Risco",
      table: {
        risk: "Risco"
      },
      empty: {
        no_risks: {
          title: "Crie um risco para começar",
          description: "Acompanhe e classifique riscos, crie e atribua tarefas de mitigação para sua equipe e gerencie seu registro de risco tudo em uma interface simples."
        },
        create_risk: "Criar um risco"
      }
    },
    metrics: {
      probability: "Probabilidade",
      impact: "Impacto",
      inherentRisk: "Risco Inerente",
      residualRisk: "Risco Residual"
    },
    form: {
      update_inherent_risk: "Salvar Risco Inerente",
      update_inherent_risk_description: "Atualize o risco inerente do risco. Este é o nível de risco antes de qualquer controle ser aplicado.",
      update_inherent_risk_success: "Risco inerente atualizado com sucesso",
      update_inherent_risk_error: "Falha ao atualizar risco inerente",
      update_residual_risk: "Salvar Risco Residual",
      update_residual_risk_description: "Atualize o risco residual do risco. Este é o nível de risco após a aplicação de controles.",
      update_residual_risk_success: "Risco residual atualizado com sucesso",
      update_residual_risk_error: "Falha ao atualizar risco residual",
      update_risk: "Atualizar Risco",
      update_risk_description: "Atualize o título ou a descrição do risco.",
      update_risk_success: "Risco atualizado com sucesso",
      update_risk_error: "Falha ao atualizar risco",
      create_risk_success: "Risco criado com sucesso",
      create_risk_error: "Falha ao criar risco",
      risk_details: "Detalhes do Risco",
      risk_title: "Título do Risco",
      risk_title_description: "Digite um nome para o risco",
      risk_description: "Descrição",
      risk_description_description: "Digite uma descrição para o risco",
      risk_category: "Categoria",
      risk_category_placeholder: "Selecione uma categoria",
      risk_department: "Departamento",
      risk_department_placeholder: "Selecione um departamento",
      risk_status: "Status do Risco",
      risk_status_placeholder: "Selecione um status de risco"
    },
    tasks: {
      title: "Tarefas",
      attachments: "Anexos",
      overview: "Visão Geral da Tarefa",
      form: {
        title: "Detalhes da Tarefa",
        task_title: "Título da Tarefa",
        status: "Status da Tarefa",
        status_placeholder: "Selecione um status de tarefa",
        task_title_description: "Digite um nome para a tarefa",
        description: "Descrição",
        description_description: "Digite uma descrição para a tarefa",
        due_date: "Data de Vencimento",
        due_date_description: "Selecione a data de vencimento para a tarefa",
        success: "Tarefa criada com sucesso",
        error: "Falha ao criar tarefa"
      },
      sheet: {
        title: "Criar Tarefa",
        update: "Atualizar Tarefa",
        update_description: "Atualize o título ou a descrição da tarefa."
      },
      empty: {
        description_create: "Crie uma tarefa de mitigação para este risco, adicione um plano de tratamento e atribua a um membro da equipe."
      }
    }
  },
  settings: {
    general: {
      title: "Geral",
      org_name: "Nome da Organização",
      org_name_description: "Este é o nome visível da sua organização. Você deve usar o nome legal da sua organização.",
      org_name_tip: "Por favor, use no máximo 32 caracteres.",
      org_website: "Website da Organização",
      org_website_description: "Este é o URL do website oficial da sua organização. Certifique-se de incluir o URL completo com https://.",
      org_website_tip: "Por favor, insira um URL válido incluindo https://",
      org_website_error: "Erro ao atualizar o website da organização",
      org_website_updated: "Website da organização atualizado",
      org_delete: "Excluir organização",
      org_delete_description: "Remova permanentemente sua organização e todo o seu conteúdo da plataforma Comp AI. Esta ação não é reversível - continue com cautela.",
      org_delete_alert_title: "Você tem certeza absoluta?",
      org_delete_alert_description: "Esta ação não pode ser desfeita. Isso excluirá permanentemente sua organização e removerá seus dados de nossos servidores.",
      org_delete_error: "Erro ao excluir organização",
      org_delete_success: "Organização excluída",
      org_name_updated: "Nome da organização atualizado",
      org_name_error: "Erro ao atualizar o nome da organização",
      save_button: "Salvar",
      delete_button: "Excluir",
      delete_confirm: "EXCLUIR",
      delete_confirm_tip: "Digite EXCLUIR para confirmar.",
      cancel_button: "Cancelar"
    },
    members: {
      title: "Membros"
    },
    billing: {
      title: "Faturamento"
    },
    api_keys: {
      title: "API",
      description: "Gerencie chaves da API para acesso programático aos dados da sua organização.",
      list_title: "Chaves da API",
      list_description: "As chaves da API permitem acesso seguro aos dados da sua organização através da nossa API.",
      create: "Nova Chave da API",
      create_title: "Nova Chave da API",
      create_description: "Crie uma nova chave da API para acesso programático aos dados da sua organização.",
      created_title: "Chave da API Criada",
      created_description: "Sua chave da API foi criada. Certifique-se de copiá-la agora, pois você não poderá vê-la novamente.",
      name: "Nome",
      name_label: "Nome",
      name_placeholder: "Insira um nome para esta chave da API",
      expiration: "Expiração",
      expiration_placeholder: "Selecione a expiração",
      expires_label: "Expira",
      expires_placeholder: "Selecione a expiração",
      expires_30days: "30 dias",
      expires_90days: "90 dias",
      expires_1year: "1 ano",
      expires_never: "Nunca",
      thirty_days: "30 dias",
      ninety_days: "90 dias",
      one_year: "1 ano",
      your_key: "Sua Chave da API",
      api_key: "Chave da API",
      save_warning: "Esta chave será exibida apenas uma vez. Certifique-se de copiá-la agora.",
      copied: "Chave da API copiada para a área de transferência",
      close_confirm: "Você tem certeza de que deseja fechar? Você não poderá ver esta chave da API novamente.",
      revoke_confirm: "Você tem certeza de que deseja revogar esta chave da API? Esta ação não pode ser desfeita.",
      revoke_title: "Revogar Chave da API",
      revoke: "Revogar",
      created: "Criada",
      expires: "Expira",
      last_used: "Último Uso",
      actions: "Ações",
      never: "Nunca",
      never_used: "Nunca usada",
      no_keys: "Nenhuma chave da API encontrada. Crie uma para começar.",
      security_note: "As chaves da API fornecem acesso total aos dados da sua organização. Mantenha-as seguras e rotacione-as regularmente.",
      fetch_error: "Falha ao buscar chaves da API",
      create_error: "Falha ao criar chave da API",
      revoked_success: "Chave da API revogada com sucesso",
      revoked_error: "Falha ao revogar chave da API",
      done: "Concluído"
    },
    team: {
      tabs: {
        members: "Membros da Equipe",
        invite: "Convidar Membros"
      },
      members: {
        title: "Membros da Equipe",
        empty: {
          no_organization: {
            title: "Sem Organização",
            description: "Você não faz parte de nenhuma organização"
          },
          no_members: {
            title: "Sem Membros",
            description: "Não há membros ativos em sua organização"
          }
        },
        role: {
          owner: "Proprietário",
          admin: "Admin",
          member: "Membro",
          viewer: "Visualizador"
        },
        description: "Gerencie os membros da sua equipe e suas funções",
        status: {
          accepted: "Aceito",
          pending: "Pendente"
        }
      },
      invitations: {
        title: "Convites Pendentes",
        description: "Usuários que foram convidados, mas ainda não aceitaram",
        empty: {
          no_organization: {
            title: "Sem Organização",
            description: "Você não faz parte de nenhuma organização"
          },
          no_invitations: {
            title: "Sem Convites Pendentes",
            description: "Não há convites pendentes"
          }
        },
        invitation_sent: "Convite enviado",
        actions: {
          resend: "Reenviar Convite",
          sending: "Enviando Convite",
          revoke: "Revogar",
          revoke_title: "Revogar Convite",
          revoke_description_prefix: "Você tem certeza de que deseja revogar o convite para",
          revoke_description_suffix: "Esta ação não pode ser desfeita."
        },
        toast: {
          resend_success_prefix: "Um e-mail de convite foi enviado para",
          resend_error: "Falha ao enviar convite",
          resend_unexpected: "Ocorreu um erro inesperado ao enviar o convite",
          revoke_success_prefix: "Convite para",
          revoke_success_suffix: "foi revogado",
          revoke_error: "Falha ao revogar convite",
          revoke_unexpected: "Ocorreu um erro inesperado ao revogar o convite"
        }
      },
      invite: {
        title: "Convidar Membro da Equipe",
        description: "Envie um convite para um novo membro da equipe se juntar à sua organização",
        form: {
          email: {
            label: "E-mail",
            placeholder: "membro@exemplo.com",
            error: "Por favor, insira um endereço de e-mail válido"
          },
          role: {
            label: "Função",
            placeholder: "Selecione uma função",
            error: "Por favor, selecione uma função"
          },
          department: {
            label: "Departamento",
            placeholder: "Selecione um departamento",
            error: "Por favor, selecione um departamento"
          },
          departments: {
            none: "Nenhum",
            it: "TI",
            hr: "RH",
            admin: "Admin",
            gov: "Governo",
            itsm: "ITSM",
            qms: "QMS"
          }
        },
        button: {
          send: "Enviar Convite",
          sending: "Enviando convite...",
          sent: "Convite Enviado"
        },
        toast: {
          error: "Falha ao enviar convite",
          unexpected: "Ocorreu um erro inesperado ao enviar o convite"
        },
        error: {
          title: "Erro de Convite",
          description: "Houve um problema com seu convite:",
          "default": "Ocorreu um erro desconhecido com seu convite.",
          home: "Ir para a Página Inicial",
          signin: "Entrar"
        }
      },
      member_actions: {
        actions: "Ações",
        change_role: "Alterar Função",
        remove_member: "Remover Membro",
        remove_confirm: {
          title: "Remover Membro da Equipe",
          description_prefix: "Você tem certeza de que deseja remover",
          description_suffix: "Esta ação não pode ser desfeita."
        },
        role_dialog: {
          title: "Alterar Função",
          description_prefix: "Atualizar a função de",
          role_label: "Função",
          role_placeholder: "Selecione uma função",
          role_descriptions: {
            admin: "Os administradores podem gerenciar membros da equipe e configurações.",
            member: "Os membros podem usar todos os recursos, mas não podem gerenciar membros da equipe.",
            viewer: "Os visualizadores podem apenas visualizar o conteúdo sem fazer alterações."
          },
          cancel: "Cancelar",
          update: "Atualizar Função"
        },
        toast: {
          remove_success: "foi removido da organização",
          remove_error: "Falha ao remover membro",
          remove_unexpected: "Ocorreu um erro inesperado ao remover o membro",
          update_role_success: "teve sua função atualizada para",
          update_role_error: "Falha ao atualizar função do membro",
          update_role_unexpected: "Ocorreu um erro inesperado ao atualizar a função do membro"
        }
      }
    }
  },
  user_menu: {
    theme: "Tema",
    language: "Idioma",
    sign_out: "Sair",
    account: "Conta",
    support: "Suporte",
    settings: "Configurações",
    teams: "Equipes"
  },
  frameworks: {
    title: "Estruturas",
    controls: {
      title: "Controles",
      description: "Revise e gerencie controles de conformidade",
      table: {
        status: "Status",
        control: "Controle",
        artifacts: "Artefatos",
        actions: "Ações"
      },
      statuses: {
        not_started: "Não Iniciado",
        completed: "Concluído",
        in_progress: "Em Andamento"
      }
    },
    overview: {
      error: "Falha ao carregar frameworks",
      loading: "Carregando frameworks...",
      empty: {
        title: "Nenhum framework selecionado",
        description: "Selecione frameworks para começar sua jornada de conformidade"
      },
      progress: {
        title: "Progresso do Framework",
        empty: {
          title: "Nenhum framework ainda",
          description: "Comece adicionando um framework de conformidade para acompanhar seu progresso",
          action: "Adicionar Framework"
        }
      },
      grid: {
        welcome: {
          title: "Bem-vindo ao Comp AI",
          description: "Comece selecionando os frameworks de conformidade que você gostaria de implementar. Nós o ajudaremos a gerenciar e acompanhar sua jornada de conformidade em múltiplos padrões.",
          action: "Começar"
        },
        title: "Selecionar Frameworks",
        version: "Versão",
        actions: {
          clear: "Limpar",
          confirm: "Confirmar Seleção"
        }
      }
    }
  },
  vendor: {
    title: "Painel",
    register_title: "Gerenciamento de Fornecedores",
    dashboard: {
      title: "Painel",
      overview: "Visão Geral do Fornecedor",
      vendor_status: "Status do Fornecedor",
      vendor_category: "Categorias de Fornecedor",
      vendors_by_assignee: "Fornecedores por Responsável",
      inherent_risk_description: "Nível de risco inicial antes que quaisquer controles sejam aplicados",
      residual_risk_description: "Nível de risco restante após a aplicação de controles"
    },
    register: {
      title: "Registro de Fornecedor",
      table: {
        name: "Nome",
        category: "Categoria",
        status: "Status",
        owner: "Proprietário"
      }
    },
    category: {
      cloud: "Nuvem",
      infrastructure: "Infraestrutura",
      software_as_a_service: "SaaS",
      finance: "Finanças",
      marketing: "Marketing",
      sales: "Vendas",
      hr: "RH",
      other: "Outro"
    },
    vendors: "fornecedores",
    form: {
      vendor_details: "Detalhes do Fornecedor",
      vendor_name: "Nome",
      vendor_name_placeholder: "Digite o nome do fornecedor",
      vendor_website: "Website",
      vendor_website_placeholder: "Digite o website do fornecedor",
      vendor_description: "Descrição",
      vendor_description_placeholder: "Digite a descrição do fornecedor",
      vendor_category: "Categoria",
      vendor_category_placeholder: "Selecione a categoria",
      vendor_status: "Status",
      vendor_status_placeholder: "Selecione o status",
      create_vendor_success: "Fornecedor criado com sucesso",
      create_vendor_error: "Falha ao criar fornecedor",
      update_vendor_success: "Fornecedor atualizado com sucesso",
      update_vendor_error: "Falha ao atualizar fornecedor",
      contacts: "Contatos do Fornecedor",
      contact_name: "Nome do Contato",
      contact_email: "Email do Contato",
      contact_role: "Função do Contato",
      add_contact: "Adicionar Contato",
      new_contact: "Novo Contato",
      min_one_contact_required: "Um fornecedor deve ter pelo menos um contato"
    },
    empty_states: {
      no_vendors: {
        title: "Nenhum fornecedor ainda",
        description: "Comece criando seu primeiro fornecedor"
      },
      no_results: {
        title: "Nenhum resultado encontrado",
        description: "Nenhum fornecedor corresponde à sua pesquisa",
        description_with_filters: "Tente ajustar seus filtros"
      }
    }
  },
  people: {
    title: "Pessoas",
    details: {
      taskProgress: "Progresso da Tarefa",
      tasks: "Tarefas",
      noTasks: "Nenhuma tarefa atribuída ainda"
    },
    description: "Gerencie os membros da sua equipe e seus papéis.",
    filters: {
      search: "Pesquisar pessoas...",
      role: "Filtrar por papel"
    },
    actions: {
      invite: "Adicionar Funcionário",
      clear: "Limpar filtros"
    },
    table: {
      name: "Nome",
      email: "Email",
      department: "Departamento",
      externalId: "ID Externo",
      status: "Status"
    },
    empty: {
      no_employees: {
        title: "Nenhum funcionário ainda",
        description: "Comece convidando seu primeiro membro da equipe."
      },
      no_results: {
        title: "Nenhum resultado encontrado",
        description: "Nenhum funcionário corresponde à sua pesquisa",
        description_with_filters: "Tente ajustar seus filtros"
      }
    },
    invite: {
      title: "Adicionar Funcionário",
      description: "Adicione um funcionário à sua organização.",
      email: {
        label: "Endereço de email",
        placeholder: "Digite o endereço de email"
      },
      role: {
        label: "Função",
        placeholder: "Selecione uma função"
      },
      name: {
        label: "Nome",
        placeholder: "Digite o nome"
      },
      department: {
        label: "Departamento",
        placeholder: "Selecione um departamento"
      },
      submit: "Adicionar Funcionário",
      success: "Funcionário adicionado com sucesso",
      error: "Falha ao adicionar funcionário"
    }
  },
  errors: {
    unexpected: "Algo deu errado, por favor tente novamente",
    unauthorized: {
      title: "Acesso Não Autorizado",
      description: "Você não tem permissão para acessar este recurso. Por favor, entre em contato com seu administrador se você acreditar que isso é um erro.",
      back: "Voltar para a Página Inicial"
    }
  },
  sub_pages: {
    risk: {
      overview: "Gestão de Riscos",
      register: "Registro de Riscos",
      risk_overview: "Visão Geral dos Riscos",
      risk_comments: "Comentários sobre Riscos",
      tasks: {
        task_overview: "Visão Geral da Tarefa"
      }
    },
    policies: {
      all: "Todas as Políticas",
      editor: "Editor de Políticas",
      policy_details: "Detalhes da política"
    },
    people: {
      all: "Pessoas",
      employee_details: "Detalhes do Funcionário"
    },
    settings: {
      members: "Membros da Equipe"
    },
    frameworks: {
      overview: "Estruturas"
    },
    evidence: {
      title: "Evidência",
      list: "Lista de Evidências",
      overview: "Visão Geral das Evidências"
    },
    tests: {
      overview: "Testes em Nuvem",
      test_details: "Detalhes do Teste"
    },
    vendors: {
      overview: "Fornecedores",
      register: "Registro de Fornecedor"
    }
  },
  editor: {
    ai: {
      thinking: "A IA está pensando",
      thinking_spinner: "A IA está pensando",
      edit_or_generate: "Editar ou gerar...",
      tell_ai_what_to_do_next: "Diga à IA o que fazer a seguir",
      request_limit_reached: "Você atingiu seu limite de solicitações para o dia."
    },
    ai_selector: {
      improve: "Melhorar a escrita",
      fix: "Corrigir gramática",
      shorter: "Tornar mais curto",
      longer: "Tornar mais longo",
      "continue": "Continuar escrevendo",
      replace: "Substituir seleção",
      insert: "Inserir abaixo",
      discard: "Descartar"
    }
  },
  evidence: {
    title: "Tarefas de Evidência",
    list: "Todas as Evidências",
    edit: "Editar Evidência"
  },
  upload: {
    fileSection: {
      filesUploaded: "{count} arquivo(s) enviado(s)",
      upload: "{count} arquivo(s) enviado(s)"
    },
    fileUpload: {
      uploadingText: "Enviando...",
      dropFileHere: "Solte o arquivo aqui",
      releaseToUpload: "Solte para enviar",
      addFiles: "Adicionar Arquivos",
      uploadAdditionalEvidence: "Enviar um arquivo",
      dragDropOrClick: "Arraste e solte ou clique para enviar",
      dropFileHereAlt: "Solte o arquivo aqui",
      dragDropOrClickToSelect: "Arraste e solte um arquivo aqui ou clique para selecionar",
      maxFileSize: "Tamanho máximo do arquivo: {size}MB",
      uploadingFile: "Enviando arquivo..."
    },
    fileCard: {
      preview: "Pré-visualização",
      previewNotAvailable: "Pré-visualização não disponível. Clique no botão de download para visualizar o arquivo.",
      filePreview: "Pré-visualização do arquivo: {fileName}",
      openFile: "Abrir arquivo",
      deleteFile: "Excluir arquivo",
      deleteFileConfirmTitle: "Excluir Arquivo",
      deleteFileConfirmDescription: "Você tem certeza de que deseja excluir este arquivo? Esta ação não pode ser desfeita."
    },
    fileUrl: {
      additionalLinks: "Links Adicionais",
      add: "Adicionar",
      linksAdded: "{count} link{s} adicionado",
      enterUrl: "Digite a URL",
      addAnotherLink: "Adicionar Outro Link",
      saveLinks: "Salvar Links",
      urlBadge: "URL",
      copyLink: "Copiar link",
      openLink: "Abrir link",
      deleteLink: "Excluir link"
    }
  },
  tests: {
    name: "Testes em Nuvem",
    title: "Testes em Nuvem",
    actions: {
      create: "Adicionar Teste em Nuvem",
      clear: "Limpar filtros",
      refresh: "Atualizar",
      refresh_success: "Testes atualizados com sucesso",
      refresh_error: "Falha ao atualizar os testes"
    },
    empty: {
      no_tests: {
        title: "Nenhum teste em nuvem ainda",
        description: "Comece criando seu primeiro teste na nuvem."
      },
      no_results: {
        title: "Nenhum resultado encontrado",
        description: "Nenhum teste corresponde à sua pesquisa",
        description_with_filters: "Tente ajustar seus filtros"
      }
    },
    filters: {
      search: "Pesquisar testes...",
      role: "Filtrar por fornecedor"
    },
    register: {
      title: "Adicionar Teste em Nuvem",
      description: "Configurar um novo teste de conformidade em nuvem.",
      submit: "Criar Teste",
      success: "Teste criado com sucesso",
      invalid_json: "Configuração JSON inválida fornecida",
      title_field: {
        label: "Título do Teste",
        placeholder: "Digite o título do teste"
      },
      description_field: {
        label: "Descrição",
        placeholder: "Digite a descrição do teste"
      },
      provider: {
        label: "Fornecedor de Nuvem",
        placeholder: "Selecione o fornecedor de nuvem"
      },
      config: {
        label: "Configuração do Teste",
        placeholder: "Digite a configuração JSON para o teste"
      },
      auth_config: {
        label: "Configuração de Autenticação",
        placeholder: "Digite a configuração JSON de autenticação"
      }
    },
    table: {
      title: "Título",
      provider: "Fornecedor",
      severity: "Severidade",
      result: "Resultado",
      createdAt: "Criado Em",
      assignedUser: "Usuário Atribuído",
      assignedUserEmpty: "Não Atribuído",
      no_results: "Nenhum resultado encontrado",
      status: "Status"
    },
    dashboard: {
      overview: "Visão Geral",
      all: "Todos os Testes",
      tests_by_assignee: "Testes por Atribuidor",
      passed: "Aprovado",
      failed: "Reprovado",
      severity_distribution: "Distribuição da Severidade do Teste"
    },
    severity: {
      low: "Baixo",
      medium: "Médio",
      high: "Alto",
      critical: "Crítico",
      info: "Informação"
    }
  },
  vendors: {
    title: "Fornecedores",
    register: {
      title: "Registro de Fornecedor",
      create_new: "Criar Fornecedor"
    },
    dashboard: {
      title: "Visão Geral"
    },
    create: "Criar Fornecedor",
    form: {
      vendor_details: "Detalhes do Fornecedor",
      vendor_name: "Nome",
      vendor_name_placeholder: "Digite o nome do fornecedor",
      vendor_website: "Website",
      vendor_website_placeholder: "Digite o website do fornecedor",
      vendor_description: "Descrição",
      vendor_description_placeholder: "Digite a descrição do fornecedor",
      vendor_category: "Categoria",
      vendor_category_placeholder: "Selecione a categoria",
      vendor_status: "Status",
      vendor_status_placeholder: "Selecione o status",
      create_vendor_success: "Fornecedor criado com sucesso",
      create_vendor_error: "Falha ao criar fornecedor",
      update_vendor: "Atualizar Fornecedor",
      update_vendor_success: "Fornecedor atualizado com sucesso",
      update_vendor_error: "Falha ao atualizar fornecedor",
      add_comment: "Adicionar Comentário"
    },
    table: {
      name: "Nome",
      category: "Categoria",
      status: "Status",
      owner: "Proprietário"
    },
    filters: {
      search_placeholder: "Pesquisar fornecedores...",
      status_placeholder: "Filtrar por status",
      category_placeholder: "Filtrar por categoria",
      owner_placeholder: "Filtrar por proprietário"
    },
    empty_states: {
      no_vendors: {
        title: "Nenhum fornecedor ainda",
        description: "Comece criando seu primeiro fornecedor"
      },
      no_results: {
        title: "Nenhum resultado encontrado",
        description: "Nenhum fornecedor corresponde à sua pesquisa",
        description_with_filters: "Tente ajustar seus filtros"
      }
    },
    actions: {
      create: "Criar Fornecedor"
    },
    status: {
      not_assessed: "Não Avaliado",
      in_progress: "Em Andamento",
      assessed: "Avaliado"
    },
    category: {
      cloud: "Nuvem",
      infrastructure: "Infraestrutura",
      software_as_a_service: "Software como Serviço",
      finance: "Finanças",
      marketing: "Marketing",
      sales: "Vendas",
      hr: "RH",
      other: "Outro"
    }
  },
  dashboard: {
    risk_status: "Status de Risco",
    risks_by_department: "Riscos por Departamento",
    vendor_status: "Status do Fornecedor",
    vendors_by_category: "Fornecedores por Categoria"
  },
  team: {
    tabs: {
      members: "Membros da Equipe",
      invite: "Convidar Membros"
    },
    members: {
      title: "Membros da Equipe",
      empty: {
        no_organization: {
          title: "Sem Organização",
          description: "Você não faz parte de nenhuma organização"
        },
        no_members: {
          title: "Sem Membros",
          description: "Não há membros ativos em sua organização"
        }
      },
      role: {
        owner: "Proprietário",
        admin: "Admin",
        member: "Membro",
        viewer: "Visualizador"
      }
    },
    invitations: {
      title: "Convites Pendentes",
      description: "Usuários que foram convidados, mas ainda não aceitaram",
      empty: {
        no_organization: {
          title: "Sem Organização",
          description: "Você não faz parte de nenhuma organização"
        },
        no_invitations: {
          title: "Sem Convites Pendentes",
          description: "Não há convites pendentes"
        }
      },
      invitation_sent: "Convite enviado",
      actions: {
        resend: "Reenviar Convite",
        sending: "Enviando Convite",
        revoke: "Revogar",
        revoke_title: "Revogar Convite",
        revoke_description_prefix: "Você tem certeza de que deseja revogar o convite para",
        revoke_description_suffix: "Esta ação não pode ser desfeita."
      },
      toast: {
        resend_success_prefix: "Um e-mail de convite foi enviado para",
        resend_error: "Falha ao enviar convite",
        resend_unexpected: "Ocorreu um erro inesperado ao enviar o convite",
        revoke_success_prefix: "Convite para",
        revoke_success_suffix: "foi revogado",
        revoke_error: "Falha ao revogar convite",
        revoke_unexpected: "Ocorreu um erro inesperado ao revogar o convite"
      }
    },
    invite: {
      title: "Convidar Membro da Equipe",
      description: "Envie um convite para um novo membro da equipe se juntar à sua organização",
      form: {
        email: {
          label: "E-mail",
          placeholder: "membro@exemplo.com",
          error: "Por favor, insira um endereço de e-mail válido"
        },
        role: {
          label: "Função",
          placeholder: "Selecione uma função",
          error: "Por favor, selecione uma função"
        },
        department: {
          label: "Departamento",
          placeholder: "Selecione um departamento",
          error: "Por favor, selecione um departamento"
        },
        departments: {
          none: "Nenhum",
          it: "TI",
          hr: "RH",
          admin: "Admin",
          gov: "Governo",
          itsm: "ITSM",
          qms: "QMS"
        }
      },
      button: {
        send: "Enviar Convite",
        sending: "Enviando convite...",
        sent: "Convite Enviado"
      },
      toast: {
        error: "Falha ao enviar convite",
        unexpected: "Ocorreu um erro inesperado ao enviar o convite"
      }
    },
    member_actions: {
      actions: "Ações",
      change_role: "Alterar Função",
      remove_member: "Remover Membro",
      remove_confirm: {
        title: "Remover Membro da Equipe",
        description_prefix: "Você tem certeza de que deseja remover",
        description_suffix: "Esta ação não pode ser desfeita."
      },
      role_dialog: {
        title: "Alterar Função",
        description_prefix: "Atualizar a função de",
        role_label: "Função",
        role_placeholder: "Selecione uma função",
        role_descriptions: {
          admin: "Os administradores podem gerenciar membros da equipe e configurações.",
          member: "Os membros podem usar todos os recursos, mas não podem gerenciar membros da equipe.",
          viewer: "Os visualizadores podem apenas visualizar o conteúdo sem fazer alterações."
        },
        cancel: "Cancelar",
        update: "Atualizar Função"
      },
      toast: {
        remove_success: "foi removido da organização",
        remove_error: "Falha ao remover membro",
        remove_unexpected: "Ocorreu um erro inesperado ao remover o membro",
        update_role_success: "teve sua função atualizada para",
        update_role_error: "Falha ao atualizar função do membro",
        update_role_unexpected: "Ocorreu um erro inesperado ao atualizar a função do membro"
      }
    }
  }
} as const;
