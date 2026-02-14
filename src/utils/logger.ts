import pc from "picocolors"

export const logger = {
	info(message: string): void {
		console.log(pc.blue("info"), message)
	},

	success(message: string): void {
		console.log(pc.green("✔"), message)
	},

	warn(message: string): void {
		console.log(pc.yellow("⚠"), message)
	},

	error(message: string): void {
		console.error(pc.red("✖"), message)
	},

	step(message: string): void {
		console.log(pc.cyan("▸"), message)
	},

	blank(): void {
		console.log()
	},

	title(message: string): void {
		console.log()
		console.log(pc.bold(pc.magenta(message)))
		console.log()
	},

	banner(message: string): void {
		const border = "═".repeat(message.length + 4)
		console.log()
		console.log(pc.bold(pc.cyan(`╔${border}╗`)))
		console.log(pc.bold(pc.cyan(`║  ${message}  ║`)))
		console.log(pc.bold(pc.cyan(`╚${border}╝`)))
		console.log()
	},

	section(message: string): void {
		console.log()
		console.log(pc.bold(pc.blue(`┌─ ${message}`)))
		console.log(pc.bold(pc.blue("│")))
	},

	sectionEnd(): void {
		console.log(pc.bold(pc.blue("└─")))
		console.log()
	},
}
