/* checksum : 937f508840ec0f8979a5e235ff09e6ff */
@cds.external : true
@m.IsDefaultEntityContainer : 'true'
@sap.message.scope.supported : 'true'
@sap.supported.formats : 'atom json xlsx'
service S4_PRODUCT {};

@cds.external : true
@cds.persistence.skip : true
@sap.creatable : 'false'
@sap.updatable : 'false'
@sap.deletable : 'false'
@sap.content.version : '1'
@sap.label : 'ProductText'
entity S4_PRODUCT.YY1_ProductText {
  @sap.display.format : 'UpperCase'
  @sap.required.in.filter : 'false'
  @sap.label : 'Material Code'
  @sap.quickinfo : 'Material Number'
  key Product : String(40) not null;
  @sap.required.in.filter : 'false'
  @sap.label : 'Language Key'
  key Language : String(2) not null;
  @sap.required.in.filter : 'false'
  @sap.label : 'Product Name'
  @sap.quickinfo : 'Product Description'
  ProductName : String(40);
};

