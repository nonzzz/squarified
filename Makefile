bootstrap:
	@echo "Install dependiences"
	corepack enable
	pnpm install


build-lib:
	@echo "Build library"
	@pnpm exec rollup --config rollup.config.mts --configPlugin swc3

dev-server:
	@echo "Start dev server"
	@pnpm exec vite

build-server:
	@echo "Build server"
	@pnpm exec vite build
