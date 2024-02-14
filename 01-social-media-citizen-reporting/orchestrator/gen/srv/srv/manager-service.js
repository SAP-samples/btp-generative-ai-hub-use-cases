module.exports = async function () {
    const db = await cds.connect.to("db");
    const {
        ProcessedIssues
    } = db.entities;

    //  [UNUSED] For testing purpose
    this.on('acceptGenAISuggestion', async req => {
        let { processedIssues: ID, newprocessor } = req.data
        let processedIssues = await SELECT.from(ProcessedIssues, ID, b => b.processor)

        console.log(req.data);

        // db.run(INSERT.into(ProcessedIssues).columns(
        //     'processor', 'decision', 'redditPostID', 'maintenanceNotificationID'
        // ).values(
        //     '201', 'Wuthering Heights', '101', '12'
        // ));

        console.log(processedIssues);

        // Reduce stock in database and return updated stock value
        await UPDATE(ProcessedIssues, ID).with({ processor: processedIssues.processor = newprocessor })
        return processedIssues
    })

    // this.on('READ', IssuesProcessed, async req => {
    //     // req.error({
    //     //     code: "Error in S4HC Service Request Call",
    //     //     message: "asd",
    //     //     target: "admin-service.js|createMO",
    //     //     status: 419,
    //     // });
    // });

    this.before("CREATE", "ProcessedIssues", genid);
};

/** Generate primary keys for target entity in request */
async function genid(req) {
    const { ID } = await cds
        .tx(req)
        .run(SELECT.one.from(req.target).columns("max(ID) as ID"));
    req.data.ID = ID + 1;
}