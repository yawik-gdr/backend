"use strict";
var solr = require("solr-client");
// http://localhost:8983/solr/my_core/select?indent=true&q=*:*&fq={!geofilt%20sfield=point pt=43.604652,1.54&d=500}
// http://localhost:8983/solr/my_core/select?fq=%7B!geofilt%20sfield%3Dpoint%20pt%3D43.604652%2C1.54%20d%3D500%7D&indent=true&q.op=OR&q=*%3A*
/**
 * A set of functions called "actions" for `solrPublish`
 */

var solrclient = undefined;

module.exports = {
  exampleAction: async (ctx, next) => {
    try {
      ctx.body = "ok";
    } catch (err) {
      ctx.body = err;
    }
  },
  postJobs: async (ctx, next) => {
    try {
      await next();
      const t = ctx.request.body;

      if (solrclient === undefined) {
        solrclient = connect();
      }

      if ((t.event === "entry.unpublish" || t.event === "entry.delete" ) && t.model === "job") {
         deleteDoc(solrclient,t.entry.id);
      } else if (t.event === "entry.publish" && t.model === "job") {
        let solrDoc = convertJobToSolr(t.entry);
        addorupadateDocument(solrclient, solrDoc);
      } else if ((t.event === "entry.update" ) && t.model === "job") {
        const entries = await strapi.entityService.findMany("api::job.job", {
          filters: {
            id: {
              $eq: t.entry.id,
            },
          },
          sort: ["jobTitle:asc"],
          publicationState: 'live',

        });
        if (entries.length > 0){
          let solrDoc = convertJobToSolr(entries[0]);
          addorupadateDocument(solrclient, solrDoc);
        }
      }
      ctx.body = "ok";
    } catch (err) {
      ctx.body = err;
    }
  },

  getJobs: async (ctx, next) => {
    await next();
    if (solrclient === undefined) {
      solrclient = connect();
    }

    const t = ctx.request.body;
    //http://localhost:1337/api/solrGetJobs?sort[0]=jobTitle%3Aasc&filters[q]=cdcd&filters[lat]=1.23&populate=%2A&fields[0]=jobTitle&pagination[pageSize]=10&pagination[page]=1&publicationState=live&locale[0]=en
    /*
    {
  sort: [ 'jobTitle:asc' ],
  filters: { q: 'cdcd', lat: '1.23' },
  populate: '*',
  fields: [ 'jobTitle' ],
  pagination: { pageSize: '10', page: '1' },
  publicationState: 'live',
  locale: [ 'en' ]
}
*/
    let q= undefined,
      lat= undefined,
      lng= undefined,
      d= undefined,
      pageSize= undefined,
      page = undefined;
    if (ctx.request.query.filters !== undefined) {
      const filters = JSON.parse(ctx.request.query.filters);
      q = filters.q;
      lat = +filters.lat;
      lng = +filters.lng;
      d = +filters.d;
    }
    if (ctx.request.query.pagination !== undefined) {
      const pagination = JSON.parse(ctx.request.query.pagination);
      pageSize = pagination.pageSize;
      page = pagination.page;
    }
    //    const res = await testquery(solrclient, 'cdcd', 43.0, 1.54, 200,0,5000 )
    const res = await testquery(solrclient, q, lat, lng, d, page,pageSize);
    if (res.response !== undefined && res.response.numFound > 0) {
      const ids = res.response.docs.map((item) => item.id);

      try {
        const entries = await strapi.entityService.findMany("api::job.job", {
          filters: {
            id: {
              $in: ids,
            },
          },
          sort: ["jobTitle:asc"],
          publicationState: 'live',

        });

        const resbody = {};
        resbody.data = entries.map(at => {const t = {
          id:at.id,
          attributes:at};
        return t;
        }
          );
        resbody.numFound = res.response.numFound;
        resbody.start = res.response.start;
        resbody.pageSize = pageSize;
        ctx.body = resbody;

      } catch (err) {
        ctx.body = err;
      }
    } else {
      ctx.body = [];
    }
  },
};

function connect() {

  var options = {
    host: process.env.SOLR_SERVER,
    port: "8983",
    core: "my_core",
    path: "/solr",
    tls: undefined,
    secure: false,
    bigint: false,
    get_max_request_entity_size: false,
    solrVersion: 302,
    ipVersion: 4,
    request: null,
  };
  var client = solr.createClient(options);
  return client;
}

async function addorupadateDocument(client, doc) {
  let obj = await client.add([doc]);
  client.commit();
}

async function deleteDoc(client, id){
  let obj = await client.deleteByID(id);
  client.commit();

}

async function testquery(client, q, lat, lng, d, start, page) {
  let q1 = q;
  if (q === undefined || q === null || q === "") {
    q1 = "*";
  }
  let d1 = d;
  if (d === undefined || d === null || d === "" || isNaN(d)) {
    d1 = 100;
  }

  let start1 = start;
  let page1 = page;
  if (
    start === undefined ||
    start === null ||
    start === "" ||
    !Number.isInteger(start)
  ) {
    start1 = 0;
  }
  if (
    page === undefined ||
    page === null ||
    page === "" ||
    !Number.isInteger(page)
  ) {
    page1 = 20;
  }

 // start1 = start1 - 1;

  if (
    lat === 0 ||
    lat === undefined ||
    lat === null ||
    lat === "" ||
    lng === 0 ||
    lng === undefined ||
    lng === null ||
    lng === "" ||
    Number.isNaN(lat) ||
    Number.isNaN(lng)
  ) {
    var query2 = await client.query().q(q1).fl("id").start(start1).rows(page1);
    return await client.search(query2);
  } else {
    var query2 = await client
      .query()
      .q(q1)
      .set("spatial=true")
      .set("pt=" + lat + "," + lng)
      .set("sfield=point")
      .set("d=" + d1)
      .set("fq={!geofilt}")
      .sort({ "geodist()": "asc" })
      .fl("id")
      .start(start1)
      .rows(page1);
    return await client.search(query2);
  }
}

function processLocation(job, doc) {
  if (
    job.location !== undefined &&
    typeof job.location === "object" &&
    !Array.isArray(job.location) &&
    job.location !== null
  ) {
    //const loc = {};
    const location = job.location;
    //loc.entityName = "location";

    if (
      location.lat !== undefined &&
      location.lat !== "" &&
      location.lat !== undefined &&
      location.lat !== 0 &&
      location.lng !== undefined &&
      location.lng !== "" &&
      location.lng !== 0
    ) {
      const loc = {};
      loc.point = location.lat + "," + location.lng;
      loc.points = [location.lat + "," + location.lng];

      const region = location.addressRegion;
      const city = location.addressLocality;
      const country = location.addressCountry;
      const postalCode = location.postalCode;
      loc.entityName = "location";
      loc.id = job.id + "-" + location.lat + "-" + location.lng;
      loc.city = city;
      loc.country = country;
      loc.postalCode = postalCode;
      loc.region = region;
      doc.city = city;
      doc.country = country;
      doc.postalCode = postalCode;
      doc.region = region;
      doc.point = location.lat + "," + location.lng;
      doc.points = [location.lat + "," + location.lng];

      doc.country_MultiString = country;
      doc.postalCode_MultiString = postalCode;
      doc.region_MultiString = region;
      doc.city_MultiString = city;
      //      doc._childDocuments_ = [loc];
    }
    doc.location = job.formattedAddress;
  }
}

function convertJobToSolr(job) {
  const res = {};
  res.id = job.id;
  //res.applyId = job.applyId;
  res.entityName = "job";
  res.title = job.jobTitle;
  res.applicationEmail = job.applyEmail;
  if (job.link) {
    res.link = job.link;
  }
  if (job.createdAt) {
    res.dateCreated = job.createdAt;
  }
  if (job.updatedAt) {
    res.dateModified = job.updatedAt;
  }
  if (job.publishedAt) {
    res.datePublishStart = job.publishedAt;
  }
  if (job.publishEnd) {
    res.datePublishEnd = job.publishEnd;
  }
  //  res.isActive = job.isActive;
  res.lang = job.locale;
  if (job.location !== undefined) {
    processLocation(job, res);
  }

  if (job.company === false) {
    res.organizationName = job.company;
    if (job.logoRef) {
      res.companyLogo = logoRef;
    }
  } else if (
    job.org !== undefined &&
    typeof job.org === "object" &&
    !Array.isArray(job.org) &&
    job.org !== null
  ) {
    res.organizationName = job.org.name;
    res.organizationId = job.org.id;
  } else {
    res.organizationName = job.organization;
  }

  // TODO Add All html tag
  res.html =
    job.intro +
    " " +
    job.tasks +
    " " +
    job.offer +
    " " +
    job.contactInfo +
    " " +
    job.profile;

  if (
    job.classifications !== undefined &&
    job.classifications.professions !== undefined &&
    job.classifications.professions.items !== undefined
  ) {
    job.classifications.professions.items.forEach((item) => {
      res.profession_MultiString = item.name;
    });
  }

  if (
    job.classifications !== undefined &&
    job.classifications.employmentTypes !== undefined &&
    job.classifications.employmentTypes.items !== undefined
  ) {
    job.classifications.employmentTypes.items.forEach((item) => {
      res.employmentType_MultiString = item.name;
    });
  }
  if (
    job.classifications !== undefined &&
    job.classifications.industries !== undefined &&
    job.classifications.industries.items !== undefined
  ) {
    job.classifications.industries.items.forEach((item) => {
      res.industry_MultiString = item.name;
    });
  }

  return res;
}
