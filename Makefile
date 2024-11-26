JK = ./node_modules/.bin/jiek

FLAGS += --bundle
FLAGS += --loader:.html=copy
FLAGS += --loader:.json=copy
FLAGS += --outdir=./display
FLAGS += --target=chrome51
FLAGS += ./dev/index.html
FLAGS += ./dev/data.json
FLAGS += ./dev/main.ts


bootstrap:
	@echo "Install dependiences"
	corepack enable
	pnpm install


build-lib:
	@echo "Build library"
	$(JK) build --noMin .


build-pub: bootstrap build-lib
	@echo "Build publish"
	$(JK) publish -no-b


dev-server:
	@echo "Start dev server"
	./node_modules/.bin/esbuild $(FLAGS) --define:LIVE_RELOAD=true --watch --servedir=./display

build-server:
	@echo "Build server"
	./node_modules/.bin/esbuild $(FLAGS) --define:LIVE_RELOAD=false
