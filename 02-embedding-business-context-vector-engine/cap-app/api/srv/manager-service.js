module.exports = async function () {
    const db = await cds.connect.to("db");
    const {
        ProcessedIssues
    } = db.entities;

    //  [UNUSED] For testing purpose
    this.on('acceptGenAISuggestion', async req => {
        let { processedIssues: ID, newprocessor } = req.data
        let processedIssues = await SELECT.from(ProcessedIssues, ID, b => b.processor)

        await UPDATE(ProcessedIssues, ID).with({ processor: processedIssues.processor = newprocessor })
        return processedIssues
    })

    this.before("CREATE", "ProcessedIssues", genid);
};

/** Generate primary keys for target entity in request */
async function genid(req) {
    const { ID } = await cds
        .tx(req)
        .run(SELECT.one.from(req.target).columns("max(ID) as ID"));
    req.data.ID = ID + 1;
}