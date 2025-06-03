export const frameworks = {
	title: "Marcos de Cumplimiento",
	overview: {
		error: "Error al cargar los marcos de cumplimiento",
		empty: {
			title: "No hay marcos seleccionados",
			description:
				"Selecciona marcos de cumplimiento para comenzar tu proceso de cumplimiento",
		},
		progress: {
			title: "Progreso del Marco",
			empty: {
				title: "Sin marcos aún",
				description:
					"Comienza agregando un marco de cumplimiento para rastrear tu progreso",
				action: "Agregar Marco",
			},
		},
		grid: {
			welcome: {
				title: "Bienvenido a Comp AI",
				description:
					"Comienza seleccionando los marcos de cumplimiento que deseas implementar. Te ayudaremos a gestionar y rastrear tu proceso de cumplimiento a través de múltiples estándares.",
				action: "Comenzar",
			},
			title: "Seleccionar Marcos",
			version: "Versión",
			actions: {
				clear: "Limpiar",
				confirm: "Confirmar Selección",
			},
		},
	},
	controls: {
		title: "Controles",
		description: "Revisar y gestionar controles de cumplimiento",
		table: {
			status: "Estado",
			control: "Control",
			artifacts: "Artefactos",
			actions: "Acciones",
			requirements: "Requisitos Vinculados",
		},
		statuses: {
			completed: "Completado",
			in_progress: "En Progreso",
			not_started: "No Iniciado",
		},
		search: {
			placeholder: "Buscar controles...",
		},
	},
	requirements: {
		requirement: "Requisito",
		requirements: "Requisitos",
		title: "Requisitos Vinculados",
		description: "Revisar y gestionar requisitos de cumplimiento",
		table: {
			id: "ID",
			name: "Nombre",
			description: "Descripción",
			frameworkId: "Marco",
			requirementId: "ID de Requisito",
		},
		search: {
			id_placeholder: "Buscar por ID...",
			name_placeholder: "Buscar por nombre...",
			description_placeholder: "Buscar en descripción...",
			universal_placeholder: "Buscar requisitos...",
		},
	},
	artifacts: {
		title: "Políticas Vinculadas",
		table: {
			id: "ID",
			name: "Nombre",
			type: "Tipo",
			created_at: "Fecha de Creación",
			status: "Estado",
		},
		search: {
			id_placeholder: "Buscar por ID...",
			name_placeholder: "Buscar por nombre...",
			type_placeholder: "Filtrar por tipo...",
			universal_placeholder: "Buscar políticas...",
		},
		no_artifacts: "No se encontraron políticas vinculadas",
	},
	add_modal: {
		title: "Agregar Nuevos Marcos",
		description: "Selecciona los marcos de cumplimiento que deseas agregar a tu organización.",
		loading: "Agregando marcos...",
		all_enabled_description: "No hay nuevos marcos disponibles para agregar en este momento.",
		all_enabled_message: "Todos los marcos disponibles ya están habilitados en tu cuenta.",
	},
} as const;