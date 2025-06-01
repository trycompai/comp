export const implementation = {
	title: "Implementación",
	progress: {
		welcome: "Bienvenido a JUS",
		description: "Complete los siguientes pasos para finalizar su incorporación y comenzar con Comp AI.",
		status: "{completedSteps} / {totalSteps} pasos completados",
	},
	checklist: {
		optional: {
			title: "Opcional: Obtenga SOC 2 o ISO 27001 en solo 4 semanas",
			description: "Obtenga el cumplimiento SOC 2 en solo 4 semanas, implementado por el equipo de Comp AI. Paquetes desde $3,000/año - reserve una llamada y le compartiremos más información.",
			action: "Comenzar",
		},
		companyDetails: {
			title: "Complete los datos de la empresa",
			description: "Para comenzar, debe proporcionar algunos datos básicos sobre cómo opera su empresa.",
			action: "Completar datos",
		},
		policies: {
			title: "Revisar y publicar políticas",
			description: "Le hemos proporcionado todas las políticas que necesita para comenzar. Revíselas, asegúrese de que sean relevantes para su organización y luego publíquelas para que sus empleados las firmen.",
			action: "Publicar políticas",
		},
		employees: {
			title: "Agregar empleados",
			description: "Debe agregar a todos sus empleados a Comp AI, ya sea a través de una integración o agregándolos manualmente, y luego pedirles que firmen las políticas que publicó en el portal de empleados.",
			action: "Agregar un empleado",
		},
		vendors: {
			title: "Agregar proveedores",
			description: "Para marcos como SOC 2, debe evaluar e informar sobre sus proveedores. Puede agregar sus proveedores a Comp AI y asignarles niveles de riesgo. Los auditores pueden revisar los proveedores y sus niveles de riesgo.",
			action: "Agregar un proveedor",
		},
		risks: {
			title: "Gestionar riesgos",
			description: "Puede gestionar sus riesgos en Comp AI agregándolos a su organización y luego asignándolos a empleados o proveedores. Los auditores pueden revisar los riesgos y su estado.",
			action: "Crear un riesgo",
		},
		tasks: {
			title: "Completar tareas",
			description: "Las tareas en Comp AI se generan automáticamente para usted, según los marcos que seleccionó. Las tareas están vinculadas a controles, que están determinados por sus políticas. Al completar tareas, puede demostrar a los auditores que está siguiendo sus propias políticas.",
			action: "Crear una tarea",
		},
		item: {
			viewAgain: "Ver de nuevo",
			completed: "Completado",
			error: "Error al actualizar el estado",
		},
	},
	errors: {
		loadingStatus: "Error al cargar el estado de incorporación",
	},
} as const;