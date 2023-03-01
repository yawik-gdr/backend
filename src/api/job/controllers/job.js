"use strict";
const axios = require("axios");
const fs = require("fs");
const authUrl = "https://sso.cross-solution.de/auth/realms/YAWIK/protocol/openid-connect/userinfo";

/**
 *  job controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

/**
 * INFO: Upload html file to locally for job
 * @param {*} strapi
 * @param {Object} file
 * @param {String} refId
 * @param {String} field // such as html, logo default for html
 * @returns File reference object
 */
const uploadFiles = async (strapi, file, refId, field = "html") => {
  const fileStat = fs.statSync(file.path);
  const _upload = await strapi.plugins.upload.services.upload.upload({
    data: {
      refId: refId,
      ref: "api::job.job",
      field: field,
    },
    files: {
      path: file.path,
      name: file.name,
      type: file.type,
      size: fileStat.size,
    },
  });
  console.log("_upload ====--------=====------>> ", _upload)
  return _upload;
}


module.exports = createCoreController("api::job.job", ({ strapi }) => ({
  async create(ctx) {
    try {
      if (
        ctx.request &&
        ctx.request.header &&
        ctx.request.header.authorization
      ) {
        const bodyData = ctx.request.body && ctx.request.body.data ? JSON.parse(ctx.request.body.data) : {};
        const newJob = createJobObject(bodyData);
        const job = await createJob(strapi, ctx.state.user.id, newJob, ctx.request.files, bodyData.html);
        console.log('Debug OK5');
        return job;

      } else {
        return {
          error: {
            status: 4004,
            name: "keycloak_unavailable",
            message: "Cannot access Keycloak",
          },
        };
      }
    } catch (e) {
      console.log(e);
      return {
        error: {
          status: 5000,
          name: "internal_error",
          message: " " + e,
        },
      };
    }
  },
  async find(ctx) {

    try {
      if (
        ctx.request &&
        ctx.request.header &&
        ctx.request.header.authorization
      ) {
        let strapiUser = ctx.state.user.id;
        let filter = {}

        if (ctx.request.query && ctx.request.query.filters) {
          filter =  JSON.parse(ctx.request.query.filters);
        }

        ctx.query = {
          ...ctx.query,
          publicationState: 'preview',
          filters: {
            user: strapiUser,
            ...filter
          }
        }
        console.log('authenticated user', strapiUser, ctx.query);
        let job = await getJobs(ctx.query,true);
        return job;
      } else {
        console.log('anonymous request');
        let job = await getJobs(ctx.query);
        return job;
      }
    } catch (e) {
      console.log("xxx eee =======================", e)
      return {
        error: {
          status: 5000,
          name: "internal_error",
          message: " " + e,
        },
      };
    }
  },
  async findOne(ctx) {
    const { id } = ctx.params;
    try {
      console.log("FIND ONE", id);
      //let job = await strapi.service("api::job.job").findOne(id);
      let job = await strapi.entityService.findOne('api::job.job', id, {
        populate: {
          logo: true,
          html: true,
          header: true,
          org: true
        },
        publicationState: 'preview',
      });
      return {
        success: {
          job: job
        }
      }
    } catch (e) {
      console.log("xxx eee =======================", e)
      return {
        error: {
          status: 5000,
          name: "internal_error",
          message: " " + e,
        },
      };
    }
  },
  async update(ctx) {
    const { id } = ctx.params;
    try {
      if (
        ctx.request &&
        ctx.request.header &&
        ctx.request.header.authorization
      ) {
        console.log("START update", ctx);
        console.log("HTML: ", ctx.request.files);

        const bodyData = ctx.request.body && ctx.request.body.data ? JSON.parse(ctx.request.body.data) : {}
        const strapiUser = ctx.state.user.id;
        const newJob = createJobObject(bodyData);
        const html = ctx.request.files.html;

        newJob.data.user = strapiUser;
        let job = await strapi.service("api::job.job").update(id, newJob);
        uploadFiles(strapi, html, bodyData.id);

        return {
          success: {
            job: job
          }
        }
      } else {
         console.log("xxx anonymous request =======================", e)
      }
    } catch (e) {
      console.log("xxx update =======================", e)
      return {
        error: {
          status: 5000,
          name: "internal_error",
          message: " " + e,
        },
      };
    }
  },
  async delete(ctx) {
    const { id } = ctx.params;
    try {
      if (
        ctx.request &&
        ctx.request.header &&
        ctx.request.header.authorization
      ) {
        console.log("START delete", ctx);
        let strapiUser = ctx.state.user.id
        if (strapiUser) {
          ctx.query = {
            ...ctx.query,
            filters: {
              user: strapiUser
            }
          }

          let job = await strapi.service("api::job.job").delete(id, ctx.query);
          return {
            success: {
              job: job
            }
          }
        } else {
          return {
            error: {
              status: 4002,
              name: "no_job_id",
              message: "Request requires a uuid jobId " + jobId,
            },
          };
        }
      } else {
        let job = await getJobs(ctx.query);
        return job;
      }
    } catch (e) {
      console.log("xxx eee =======================", e)
      return {
        error: {
          status: 5000,
          name: "internal_error",
          message: " " + e,
        },
      };
    }
  },
}));

// ================= HELPER FUNCTIONS FOR JOBS AD ===========

/**
 * INFO: Prepare data to create job
 * @param {Object} payload
 * @returns Jobs object
 */
const createJobObject = (payload) => {
  let newJob = {
    data: {
      id: payload.id || false,
      applyEmail: payload.applyEmail || '',
      applyPost: payload.applyPost || false,
      applyUrl: payload.applyUrl || '',
      contactInfo: payload.contactInfo || '',
      contactInfoLabel: payload.contactInfoLabel || '',
      formattedAddress: payload.formattedAddress || '',
      intro: payload.intro || '',
      introLabel: payload.introLabel || '',
      jobTitle: payload.jobTitle || '',
      location: payload.location || {},
      meta: payload.meta || {},
      offer: payload.offer || '',
      offerLabel: payload.offerLabel || '',
      organization: payload.organization || '',
      org: payload.org || '',
      profile: payload.profile || '',
      profileLabel: payload.profileLabel || '',
      reference: payload.reference || '',
      salary: payload.salary || {},
      salaryVisibility: payload.salaryVisibility || true,
      taskLabel: payload.taskLabel || '',
      tasks: payload.tasks || '',
      workDuration: payload.workDuration || [],
      workKind: payload.workKind || []
    },
  };
  return newJob;
}

/**
 * Deprecated. Not needed anymore
 *
 * INFO: Authenticate user from token
 * @param {Token} authorization
 * @returns authenticated user
 */
const authUser = async (authorization) => {
  const userData = await axios({
    method: "GET",
    url: process.env.AUTH_URL ? process.env.AUTH_URL : authUrl,
    headers: {
      Authorization: authorization,
    },
  });
  if (!userData || userData.data && userData.data.error) {
    return {
      error: {
        status: 4001,
        name: "invalid_token",
        message: "Token verification failed",
      },
    };
  } else {
    return userData
  }
}

/**
 * INFO:Upload job ad file
 * @param {Scope} strapi
 * @param {File} file
 * @param {Object} html
 * @param {String} jobId
 * @returns File objects
 */
const htmlUpload = async (strapi, file, html, jobId) => {
  let _html;
  if (file && Object.keys(file).length > 0 && file.html && Object.keys(file.html).length > 0) {
    file = file.html;
    console.log("JOB_ID 1:", jobId);
    _html = await uploadFiles(strapi, file, jobId);
  } else if (html && Object.keys(html).length > 0) {
    console.log("JOB_ID 2:", jobId);
    file = html;
    _html = await uploadFiles(strapi, file, jobId);
  }
  return _html;
}

/**
 * INFO:Upload orgnization logo file
 * @param {Scope} strapi
 * @param {File} file
 * @param {Object} logo
 * @param {String} jobId
 * @returns File objects
 */
const logoUpload = async (strapi, file, logo, jobId) => {
  let _logo;
  if (file && Object.keys(file).length > 0 && file.logo && Object.keys(file.logo).length > 0) {
    file = file.logo;
    _logo = await uploadFiles(strapi, file, jobId, 'logo');
  } else if (logo && Object.keys(logo).length > 0) {
    file = logo;
    _logo = await uploadFiles(strapi, file, jobId, 'logo');
  }
  return _logo;
}

/**
 * INFO:Upload orgnization header file
 * @param {Scope} strapi
 * @param {File} file
 * @param {Object} header
 * @param {String} jobId
 * @returns File objects
 */
const headerUpload = async (strapi, file, header, jobId) => {
  let _header;
  if (file && Object.keys(file).length > 0 && file.header && Object.keys(file.header).length > 0) {
    file = file.header;
    _header = await uploadFiles(strapi, file, jobId, 'header');
  } else if (header && Object.keys(header).length > 0) {
    file = header;
    _header = await uploadFiles(strapi, file, jobId, 'header');
  }
  return _header;
}

/**
 * INFO: Create job
 * @param {Scope} strapi
 * @param {String} strapiUserId
 * @param {Object} Jobs
 * @param {Files} file
 * @param {Object} html
 * @returns Job success
 */
const createOrgnization = async (strapi, orgName, JobId, file, logo, header) => {
  let isOrgExist = await strapi.service('api::organization.organization').orgByName({ name: orgName });
  let _logo = await logoUpload(strapi, file, logo, JobId);
  let _header = await headerUpload(strapi, file, header, JobId);
  let _org = {}, _orgId;
  if (!(isOrgExist && isOrgExist.length > 0)) {
    let orgObj = {
      data: {
        name: orgName,
        logo: _logo,
        header: _header,
      }
    }
    _org = await strapi.service('api::organization.organization').addOrg(orgObj);
    if (_org?.success?.organization?.id) {
      _orgId = _org?.success?.organization?.id;
    }
  } else if (isOrgExist && isOrgExist.length && isOrgExist[0].id) {
    _orgId = isOrgExist[0].id;
  }
  return { _logo, _header, _org, _orgId };
}

/**
 * INFO: Create job
 * @param {Scope} strapi
 * @param {String} strapiUserId
 * @param {Object} Jobs
 * @param {Files} file
 * @param {Object} html
 * @returns Job success
 */
const createJob = async (strapi, strapiUserId, Jobs, file, html) => {
  let _html = await htmlUpload(strapi, file, html, Jobs.data.jobId);
  Jobs.data.user = strapiUserId;
  Jobs.data.html = _html;

  delete Jobs.data.id;
  let job = await strapi.query("api::job.job").create(Jobs);
  return {
    success: {
      job: job
    }
  }
}

/**
 * INFO: Get all jobs
 * @param {Object} payload
 * @returns All jobs array
 */
const getJobs = async (payload = null, preview = false) => {
  console.log(payload);
  let filter = {}
  console.log('payload.filters')
  console.log(payload.filters)
  if (payload.filters !== undefined &&
  typeof payload.filters === "object" &&
  !Array.isArray(payload.filters) &&
  payload.filters !== null ){
    filter = payload.filters ;
  } else {
    if (payload && payload.filters) {
      filter =  JSON.parse(payload.filters);
    }

  }

  if (preview){
    payload = {
      ...payload,
      publicationState: 'preview',
      filters: {
        ...filter
      }
    }

  }  else {
    payload = {
      ...payload,
      publicationState: 'live',
      filters: {
        ...filter
      }
    }

  }

  let job = payload ? await strapi.service("api::job.job").find(payload): await strapi.service("api::job.job").find();
  return {
    data: job.results.map( val => {
      delete val?.created_by;
      delete val?.updated_by;
      return { id: val.id, attributes: val };
    },job.results),
    meta: {
      pagination: job.pagination,
    }
  }
}
