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
  const upsertRun = db._query(
    'upsert {docId:@docId} insert @data update @data into @@collection',
    { 'docId': body._data.docId, 'data': body._data, '@collection': body._params.collection });

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

router.get('/search/load', (req, res) => {
  inflowSend(res, { "collection": "usersDoc" ,"search":[{"code":"0003T"}]})


})
router.post('/search/run', (req, res) => {
  let body = JSON.parse(req.body)
  let queries = req.queryParams
  if (!body._params.collection) {
    body._data.error = 'bad request - collection name is required';
    return inflowSend(res, body._data)
  }
  let filters = []
   body._params.search.map(el=>{
    for(let elKey in el){

      filters.push(`el.${elKey} == '${el[elKey]}'`)
    }
  }) 
  let search = "filter " + filters.join(" && ")
  let limit = queries['per_page'] ? Number(+queries['per_page']):1000
  let skip = queries['page'] ? (Number(+queries['page'])-1)*limit :0

  search+=` limit ${skip},${limit} return el`
  const result = db._query(`for el in @@collection ${search} `,{"@collection":body._params.collection }).toArray()
  return inflowSend(res, {result,search,limit,skip})

})

function inflowSend(res, data) {
  res.send({ _data: data })
}

