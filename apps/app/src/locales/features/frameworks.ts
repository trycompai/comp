export const frameworks = {
	title: "Marcos de Trabajo",
	overview: {
		error: "Error al cargar los marcos de trabajo",
		empty: {
			title: "No hay marcos de trabajo seleccionados",
			description:
				"Selecciona marcos de trabajo para comenzar tu camino hacia el cumplimiento",
		},
		progress: {
			title: "Progreso del Marco de Trabajo",
			empty: {
				title: "Aún no hay marcos de trabajo",
				description:
					"Comienza agregando un marco de cumplimiento para hacer seguimiento de tu progreso",
				action: "Agregar Marco de Trabajo",
			},
		},
		grid: {
			welcome: {
				title: "Bienvenido a Comp AI",
				description:
					"Comienza seleccionando los marcos de cumplimiento que deseas implementar. Te ayudaremos a gestionar y hacer seguimiento de tu camino hacia el cumplimiento a través de múltiples estándares.",
				action: "Comenzar",
			},
			title: "Seleccionar Marcos de Trabajo",
			version: "Versión",
			actions: {
				clear: "Limpiar",
				confirm: "Confirmar Selección",
			},
		},
	},
	controls: {
		title: "Controles",
		description: "Revisar y gestionar los controles de cumplimiento",
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
		description: "Revisar y gestionar los requisitos de cumplimiento",
		table: {
			id: "ID",
			name: "Nombre",
			description: "Descripción",
			frameworkId: "Marco de Trabajo",
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
		no_artifacts: "No se encontraron Políticas Vinculadas",
	},
	add_modal: {
		title: "Agregar Nuevos Marcos de Trabajo",
		description: "Selecciona los marcos de cumplimiento que deseas agregar a tu organización.",
		loading: "Agregando marcos de trabajo...",
		all_enabled_description: "No hay nuevos marcos de trabajo disponibles para agregar en este momento.",
		all_enabled_message: "Todos los marcos de trabajo disponibles ya están habilitados en tu cuenta.",
	},
} as const;
