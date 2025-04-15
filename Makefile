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
	npm install -g corepack@latest --force
	corepack enable
	pnpm install


build-lib:
	@echo "Build library"
	$(JK) build --noMin .
	@echo "Copying type declarations"
	cp ./global.d.ts ./dist/helper.d.ts
	cp ./global.d.ts ./dist/helper.d.mts

build-pub: bootstrap
	@echo "Build publish"
	@$(MAKE) build-lib && $(JK) publish -no-b && $(JK) postpublish


dev-server:
	@echo "Start dev server"
	./node_modules/.bin/esbuild $(FLAGS) --define:LIVE_RELOAD=true --watch --servedir=./display

lint:
	@echo "Lint"
	./node_modules/.bin/eslint --fix .

dev-docs:
	./node_modules/.bin/tsx scripts/serve.ts

build-docs:
	./node_modules/.bin/tsx scripts/render.tsx
