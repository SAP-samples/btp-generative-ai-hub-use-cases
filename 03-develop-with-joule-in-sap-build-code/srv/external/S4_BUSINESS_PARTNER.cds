/* checksum : 7c3a67f58d56921dbc267ed3afca7009 */
@cds.external : true
@m.IsDefaultEntityContainer : 'true'
@sap.message.scope.supported : 'true'
@sap.supported.formats : 'atom json xlsx'
service S4_BUSINESS_PARTNER {};

@cds.external : true
@cds.persistence.skip : true
@sap.creatable : 'false'
@sap.updatable : 'false'
@sap.deletable : 'false'
@sap.content.version : '1'
@sap.label : 'BusinessPartnerPerson'
entity S4_BUSINESS_PARTNER.YY1_BusinessPartnerPerson {
  @sap.display.format : 'UpperCase'
  @sap.required.in.filter : 'false'
  @sap.text : 'BusinessPartnerName'
  @sap.label : 'Code'
  @sap.quickinfo : 'Business Partner Number'
  key BusinessPartner : String(10) not null;
  @sap.required.in.filter : 'false'
  @sap.label : 'Business Partner Name'
  BusinessPartnerName : String(81);
};

