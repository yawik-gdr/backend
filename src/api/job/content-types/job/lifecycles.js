const fs = require("fs");
const path = require('path');

module.exports = {
  async beforeCreate(data) {
    console.log("data ----------------------->>", data)
  },
  async afterCreate(data) {
    /**
     * INFO: Service to send transaction template based mail
     * @param {String} subject
     * @param {String} sendTo
     * @param {String} template
     * @param {Array} mergeTags --> Need to send language based on country or region of reciever user
     */
    const _mergeContent = [
      { name: "Language", content: "en" }
    ]

    if (data && data.result && data.result.jobTitle) {
      _mergeContent.push({ name: "jobTitle", content: data.result.jobTitle })
    }
    if (data && data.result && data.result.organization) {
      _mergeContent.push({ name: "companyname", content: data.result.organization })
    }
    if (data?.params?.data?.html) {
      let _htmlFile = data?.params?.data?.html;
      _htmlFile = _htmlFile && _htmlFile.length && _htmlFile[0].url;
      _mergeContent.push({ name: "link", content: encodeURI("http://localhost:1337" + _htmlFile) })
    }
    const publishedJob = await strapi.api.job.services.job.findOne(data.result.id, {
        populate: "*"
    });
    //      if (data?.params?.data?.user) {
    //        let userId = data?.params?.data?.user;
    //        let strapiUser = await strapi.service('plugin::users-permissions.user').fetch({ id: userId });
    //        _mergeContent.push({ name: "username", content: strapiUser.username })
    //      }

    // there is no link in data set. Let's test with an hardcoded url
    // _mergeContent.push({ name: "link", content: 'https://jobwizard.yawik.org' })
    const params = {
      jobTitle: publishedJob.jobTitle,
      firstname: publishedJob.user.firstname,
      lastname: publishedJob.user.lastname,
      organization: publishedJob.organization,
      link: process.env.APP_URL + publishedJob.locale + "/edit/job/" + publishedJob.id
    }
    const htmlFilePath = path.join(__dirname, "../../../../../config/mails/de/job-created-check.html")
    let txtFilePath = path.join(__dirname, "../../../../../config/mails/de/job-created-check.txt")
    const emailTemplate = {
      subject: 'Job Created',
      text: fs.readFileSync(txtFilePath, "utf8"),
      html: fs.readFileSync(htmlFilePath, "utf8")
    }
    const _finalRes = await strapi.plugins['email'].services.email.sendTemplatedEmail(
      {
        to: publishedJob.user.email
      },
      emailTemplate,
      {
        params
      }
    );

    // 'Job Created', 'contact@yawik.org', 'de-job-created-check', _mergeContent);

    console.log("_finalRes in lifecycle =====------=====------>>", _finalRes)
    await strapi.plugins['email'].services.email.send({
         to: 'barais@irisa.fr', //TODO update
         subject: 'Job Created',
         text: 'Job Created',
         html: `<div><div>OK5 New job created: </div><div>ID:${data.result.id} </div></div>`,
     });
  },
};
