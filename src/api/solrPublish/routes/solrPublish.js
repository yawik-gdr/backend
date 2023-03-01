module.exports = {
  routes: [
     {
      method: 'POST',
      path: '/solrPublishJob',
      handler: 'solr-publish.postJobs',
      config: {
        policies: [],
        middlewares: [],
      },
     },
     {
      method: 'GET',
      path: '/solrGetJobs',
      handler: 'solr-publish.getJobs',
      config: {
        policies: [],
        middlewares: [],
      },
     },
  ],
};
