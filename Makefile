JK = @pnpm exec jiek --root .

bootstrap:
	@echo "Install dependiences"
	corepack enable
	pnpm install


build-lib:
	@echo "Build library"
	-rm -rf dist
	$(JK) build


build-pub: bootstrap build-lib
	@echo "Build publish"
	$(JK) pub -no-b


dev-server:
	@echo "Start dev server"
	@pnpm exec vite

build-server:
	@echo "Build server"
	@pnpm exec vite build
