/*
  Create parser:
    pegjs grammar.pegjs parser.js

  Grammar example:

  /actimo/recipients/contactId:int/messages/messageId:int?sort:string=asc|desc&key:int
*/
path
  = ps:pathElements '?' qs:queries      { return { elements: ps, query: qs }; } //ps.concat({ type: 'query', content: qs }); }
  / ps:pathElements                     { return { elements: ps }; }

pathElements
  = '/' p:pathElement ps:pathElements   { return [p].concat(ps); }
  / '/' p:pathElement                   { return [p]; }

pathElement
  = id:name ':' datatype:types          { return { type: 'identifier', id: id, datatype: datatype }; }
  / n:name                              { return { type: 'segment', name: n }; }
  / v:string                            { return { type: 'value', datatype: 'string', value: v }; }
  / v:integer                           { return { type: 'value', datatype: 'int', value: parseInt(v, 10) }; }
  / v:number                            { return { type: 'value', datatype: 'number', value: parseFloat(v, 10) }; }

queries
  = q:query '&' qs:queries              { qs[q[0]] = q[1]; return qs; }
  / q:query                             { var r = {}; r[q[0]] = q[1] || null; return r; }

query
  = k:queryKey '=' v:queryValue         { return k.datatype ? 
                                                    [k.key, { values: v, datatype: k.datatype } ] :
                                                    [k.key, Array.isArray(v) && v.length > 1 ? { values: v } : v ]; }
  / k:queryKey                          { return k.datatype ? [k.key, { datatype: k.datatype } ] : [k.key]; }

queryKey
  = k:name ':' datatype:types       { return { key: k, datatype: datatype }; }
  / k:name                          { return { key: k }; }

queryValue
  = val1:name '|' val2:queryValue   { return [val1].concat(val2); }
  / val:name                        { return val; }

/* Lexer tokens */
types
  = 'number'
  / 'int'
  / 'string'
  / 'alphanum'

name
  = s:$[a-zA-Z_]+ a:alphanum            { return s+a; }

alphanum 
  = $[a-zA-Z0-9]*

string 
  = $[a-zA-Z0-9_\.]*

number
  = $[-]?([0-9]+[\.]{1})?[0-9]+

integer
  = $[0-9]*
