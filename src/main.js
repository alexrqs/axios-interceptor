import axios from 'axios'

const onlyUnique = (value, index, self) => self.indexOf(value) === index
const requestToObjectReducer = (acc, req) => {
  const { params, ...rest } = req
  acc = Object.assign(acc, rest)

  acc.params = {
    ids: acc.params?.ids ? acc.params.ids.concat(params.ids).filter(onlyUnique) : params.ids,
  }

  return acc
}
const responseFactory = (data, conf) => ({
  data: {
    items: [...data.items].filter(item => conf.params.ids.includes(item.id)),
  },
})

/**
 * Add all request config objects to an array while
 * waiting for every request on the same stack of execution
 * with setTimeout 0 and then unify the parameters to a joint request
 * later send the response based on the params from the closure.
 *
 * @param {object} instance Axios
 */
function addInterceptor(instance) {
  const requests = []
  let responseData

  function batchRequests(conf) {
    requests.push(conf)
    return new Promise((res, rej) => {
      setTimeout(async () => {
        const batch = requests.reduce(requestToObjectReducer, {})

        if (responseData) {
          const { data } = await responseData
          res(responseFactory(data, conf))
          return
        }

        const promise = axios[batch.method](`${batch.baseURL}${batch.url}`, {
          params: batch.params,
        })
        responseData = promise
        const { data } = await promise

        res(responseFactory(data, conf))
      }, 0)
    })
  }

  instance.interceptors.request.use(
    config => {
      config.adapter = params => batchRequests(params)

      return config
    },
    error => Promise.error(),
  )
}

function client() {
  const config = {
    baseURL: 'https://europe-west1-quickstart-1573558070219.cloudfunctions.net',
  }

  const instance = axios.create(config)
  addInterceptor(instance)
  return instance
}

function test() {
  const batchUrl = '/file-batch-api'
  const batchClient = client()

  batchClient
    .get(batchUrl, { params: { ids: ['fileid1', 'fileid2'] } })
    .then(({ data }) => console.log(data, 'response f1,f2'))

  batchClient
    .get(batchUrl, { params: { ids: ['fileid2'] } })
    .then(({ data }) => console.log(data, 'response f2'))

  batchClient
    .get(batchUrl, { params: { ids: ['fileid3'] } })
    .then(({ data }) => console.log(data, 'response f3'))

  batchClient
    .get(batchUrl, { params: { ids: ['fileid4', 'fileid5'] } })
    .then(({ data }) => console.log(data, 'response f4,f5'))

  // const batchClient2 = client()
  // batchClient2
  //   .get(batchUrl, { params: { ids: ['fileid6', 'fileid7'] } })
  //   .then(({ data }) => console.log(data, 'r67'))
  // batchClient2
  //   .get(batchUrl, { params: { ids: ['fileid8', 'fileid9'] } })
  //   .then(({ data }) => console.log(data, 'r89'))
}

test()
