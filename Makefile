NODE_0_12=node-012

JSSRC = lib/unity.js lib/resolver/resolver.js
JSOBJS = $(JSSRC:.js=.es5.js)

PARSERSRC = lib/parser.pegjs
PARSEROBJS = $(PARSERSRC:.pegjs=.js)

phony: docs test es5

lib/unity.es5.js: lib/unity.js
	node_modules/.bin/babel ./lib/unity.js -o ./lib/unity.es5.js

lib/resolver/resolver.es5.js: lib/resolver/resolver.js
	node_modules/.bin/babel ./lib/resolver/resolver.js -o ./lib/resolver/resolver.es5.js

lib/parser.js: lib/parser.pegjs
	node_modules/.bin/pegjs ./lib/parser.pegjs ./lib/parser.js

es5: $(JSOBJS)

parser: $(PARSEROBJS)

test: es5 parser
	node_modules/mocha/bin/mocha test --reporter spec test

test-all: test
	$(NODE_0_12) node_modules/mocha/bin/mocha test --reporter spec test
