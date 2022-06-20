public class AssetHierarchyController {
    @AuraEnabled(cacheable=true)
    public static List<Asset> getAllParentAssets(Id parentRecId) {
        return [SELECT Id,Name,SerialNumber,Product2.Name,Parent.Name,Location.Name
                FROM Asset WHERE ID=:parentRecId LIMIT 1];
    }
    
    @AuraEnabled
    public static List<Asset> getChildAssets(Id parentId) {
        return [
            SELECT Id,Name,SerialNumber,Product2.Name,Parent.Name,Location.Name
            FROM Asset
            WHERE ParentId = :parentId
        ];
    }
    
    @AuraEnabled
    public static List<String> getAssetWithSameLocation(Id parentId,Id locationId,Id childAsset) {
               List<String> assetNameWithSameLoc=new List<String>();

        Asset selectedAsset =  [SELECT Id,Name,SerialNumber,Product2Id,Parent.Name,LocationId FROM Asset where Id=:parentId LIMIT 1];
        Asset selectedChildRec=[SELECT Id,Name, LocationId FROM Asset WHERE  Id=:childAsset LIMIT 1];
        System.debug(selectedChildRec+' '+selectedAsset);
        if(selectedAsset.LocationId!=selectedChildRec.LocationId){
            for(Asset assetRec:[SELECT Id,Name, LocationId FROM Asset WHERE  LocationId=:locationId]){
                assetNameWithSameLoc.add(assetRec.Name);
            }
        }        
        return assetNameWithSameLoc;
    }
}