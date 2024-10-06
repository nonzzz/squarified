bootstrap:
	@echo "Install dependiences"
	corepack enable
	pnpm Install


build-lib:
	@echo "Build library"
	@pnpm exec rollup --config rollup.config.mts --configPlugin swc3

watch-lib:
	@echo "Watch library"
	@pnpm exec rollup --config rollup.config.mts --configPlugin swc3 --watch

dev: watch-lib
	@echo "Create a simple static server"
	
