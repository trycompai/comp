export const onboarding = {
	title: "Crear una organización",
	submit: "Finalizar configuración",
	setup: "Bienvenido a Comp AI",
	description:
		"Cuéntanos un poco sobre tu organización y con qué marco(s) de trabajo quieres comenzar.",
	trigger: {
		title: "Espera un momento, estamos creando tu organización",
		creating: "Esto puede tomar uno o dos minutos...",
		completed: "Organización creada exitosamente",
		error: "Algo salió mal, por favor intenta de nuevo.",
	},
	fields: {
		fullName: {
			label: "Tu Nombre",
			placeholder: "Tu nombre completo",
		},
		name: {
			label: "Nombre de la Organización",
			placeholder: "Nombre de tu organización",
		},
		subdomain: {
			label: "Subdominio",
			placeholder: "ejemplo",
		},
		website: {
			label: "Sitio Web",
			placeholder: "https://ejemplo.com",
		},
	},
	success: "¡Bienvenido a Comp AI, tu organización ha sido creada!",
	error: "Algo salió mal, por favor intenta de nuevo.",
	creating: "Creando tu organización...",
	switch: "Cambiando organización...",
	organization: {
		create: "Agregar organización",
		current: "Organización actual",
		switch_to: "Cambiar a",
	},
} as const;