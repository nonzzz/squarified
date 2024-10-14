bootstrap:
	@echo "Install dependiences"
	corepack enable
	pnpm install


build-lib:
	@echo "Build library"
	@pnpm exec rollup --config rollup.config.mts --configPlugin swc3

watch-lib:
	@echo "Watch library"
	@pnpm exec rollup --config rollup.config.mts --configPlugin swc3 --watch

dev-server:
	@echo "Start dev server"
	@pnpm exec vite
