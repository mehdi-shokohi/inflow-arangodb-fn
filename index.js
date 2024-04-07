'use strict';
const createRouter = require('@arangodb/foxx/router');
const db = require('@arangodb').db;

const router = createRouter();
module.context.use(router);

router.get('', (req, res) => {
  inflowSend(res, ["query", "upsert", "save_doc"])
}).response(["application/json"]);

router.post('/query/run', (req, res) => {
  const body = JSON.parse(req.body)
  const result = db._query(`${body._params.q}`).toArray()
  return inflowSend(res, result)
}).response(["application/json"]);

router.get('/query/load', (req, res) => {
  return inflowSend(res, { "q": "for n in items limit 12000,1000 return {tid:n.terminologyId,code:n.code,value:n.value}" })
}).response(["application/json"]);

router.get('/upsert/load', (req, res) => {
  inflowSend(res, { "collection": "usersDoc" })
}).response(["application/json"]);

router.post('/upsert/run', (req, res) => {
  let body = JSON.parse(req.body)
  if (!body._params.collection) {
    body._data.error = 'bad request - collection name is required';
    return inflowSend(res, body._data)
  }
  if (!db._collection(body._params.collection)) {
    db._createDocumentCollection(body._params.collection);
  }
  body._data.docId = body._headers.inflow.docId
  const upsertRun = db._query(`upsert {docId:"${body._data.docId}"} insert ${JSON.stringify(body._data)} update ${JSON.stringify(body._data)} into ${body._params.collection}`);

  body._data.upsertMessage = upsertRun

  inflowSend(res, body._data)
}).response(["application/json"]);

router.get('/save_doc/load', (req, res) => {
  inflowSend(res, { "intoCollection": "usersDoc" })


})
router.post('/save_doc/run', (req, res) => {
  let body = JSON.parse(req.body)
  if (!body._params.intoCollection) {
    body._data.error = 'bad request - collection name is required';
    return inflowSend(res, body._data)
  }
  if (!db._collection(body._params.intoCollection)) {
    db._createDocumentCollection(body._params.intoCollection);
  }
  const colCreate = db._collection(body._params.intoCollection);
  colCreate.save(body._data)
  body._data.createMessage = colCreate

  inflowSend(res, body._data)
})




function inflowSend(res, data) {
  res.write({ _data: data })
}

