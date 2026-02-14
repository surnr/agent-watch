import pc from "picocolors"

export const logger = {
	info(message: string): void {
		console.log(pc.blue("info"), message)
	},

	success(message: string): void {
		console.log(pc.green("success"), message)
	},

	warn(message: string): void {
		console.log(pc.yellow("warn"), message)
	},

	error(message: string): void {
		console.error(pc.red("error"), message)
	},

	step(message: string): void {
		console.log(pc.cyan(">>>"), message)
	},

	blank(): void {
		console.log()
	},

	title(message: string): void {
		console.log()
		console.log(pc.bold(pc.magenta(message)))
		console.log()
	},
}
