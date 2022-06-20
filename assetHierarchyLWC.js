import { LightningElement, wire, api } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import Asset_Name from '@salesforce/schema/Asset.Name';

import LOCATION_FIELD from '@salesforce/schema/Asset.LocationId';

// Import Apex
import getAllParentAssets from "@salesforce/apex/AssetHierarchyController.getAllParentAssets";
import getChildAssets from "@salesforce/apex/AssetHierarchyController.getChildAssets";

import getAssetWithSameLocation from "@salesforce/apex/AssetHierarchyController.getAssetWithSameLocation";

import { getFieldValue, getRecord } from 'lightning/uiRecordApi';
const fields = [Asset_Name];

// Global Constants
const COLS = [
    { fieldName: "Name", label: "Asset Name" },
    { fieldName: "ParentAssetName", label: "Parent Asset" },
    { fieldName: "LocationName", label: "Location" },
    { fieldName: "Product2Id", label: "Product" },
    { fieldName: "SerialNumber", label: "Serial Number" },
    {
        type: 'button-icon',
        typeAttributes: {
            iconName: 'action:edit',
            name: 'edit_record',
            title: 'Edit',
            variant: 'border-filled',
            alternativeText: 'edit',
            disabled: false
        }
    }
];

export default class AssetHierarchyLWC extends LightningElement {
    @api recordId;
    isChildEditable = false;
    gridColumns = COLS;
    isLoading = true;
    gridData = [];

    selecteChildRecId = '';
    selectedChildAssetName = '';
    objectApiName = 'Asset';
    assetWithSameLocation = '';
    @wire(getRecord, { recordId: '$recordId', fields })
    parasset;

    @wire(getAllParentAssets, { parentRecId: '$recordId' })
    parentAssets({ error, data }) {
        if (error) {
            console.error("error loading accounts", error);
        } else if (data) {
            console.log('Data ' + JSON.stringify(data));
            this.gridData = data.map((record) => ({
                _children: [],
                ...record,
                ParentAssetName: record.Parent?.Name,
                LocationName: record.Location?.Name,
                Product2Id: record.Product2?.Name

            }));
            this.isLoading = false;
        }
    }

    get assetData() {
        return (this.gridData.length > 0 ? true : false);
    }
    get assetName() {
        return getFieldValue(this.parasset.data, Asset_Name);
    }
    get locationVal() {
        return getFieldValue(this.parasset.data, LOCATION_FIELD);
    }

    handleOnToggle(event) {
        console.log(JSON.stringify(event.detail));
        console.log(event.detail.hasChildrenContent);
        console.log(event.detail.isExpanded);
        const rowName = event.detail.name;
        this.isChildEditable = false;
        if (!event.detail.hasChildrenContent && event.detail.isExpanded) {
            this.isLoading = true;
            getChildAssets({ parentId: rowName })
                .then((result) => {
                    console.log(result);
                    if (result && result.length > 0) {
                        const newChildren = result.map((child) => ({
                            _children: [],
                            ...child,
                            ParentAssetName: child.Parent?.Name,
                            LocationName: child.Location?.Name,
                            Product2Id: child.Product2?.Name
                        }));
                        this.gridData = this.getNewDataWithChildren(
                            rowName,
                            this.gridData,
                            newChildren
                        );
                    } else {
                        this.dispatchEvent(
                            new ShowToastEvent({
                                title: "No children",
                                message: "No children for the selected Asset",
                                variant: "warning"
                            })
                        );
                    }
                })
                .catch((error) => {
                    console.log("Error loading child", error);
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: "Error Loading Children",
                            message: error + " " + error?.message,
                            variant: "error"
                        })
                    );
                })
                .finally(() => {
                    this.isLoading = false;
                });
        }
    }

    getNewDataWithChildren(rowName, data, children) {
        return data.map((row) => {
            let hasChildrenContent = false;
            if (
                Object.prototype.hasOwnProperty.call(row, "_children") &&
                Array.isArray(row._children) &&
                row._children.length > 0
            ) {
                hasChildrenContent = true;
            }

            if (row.Id === rowName) {
                row._children = children;
            } else if (hasChildrenContent) {
                this.getNewDataWithChildren(rowName, row._children, children);
            }
            return row;
        });
    }

    editChildRec(event) {
        console.log(JSON.stringify(event.detail.row.Id));
        if (this.recordId == event.detail.row.Id) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: "Warning",
                    message: "Asset " + event.detail.row.Name + " can't editable, Please Edit it through Standard Edit Button",
                    variant: "warning"
                })
            )
        } else {
            this.assetWithSameLocation = '';
            this.selecteChildRecId = event.detail.row.Id;
            this.selectedChildAssetName = event.detail.row.Name;
            if (this.selecteChildRecId) {
                this.isChildEditable = true;
            } else {
                this.isChildEditable = false;
            }
        }

    }
    closeModal() {
        this.selecteChildRecId = '';
        this.selectedChildAssetName == '';
        this.assetWithSameLocation = '';
        this.isChildEditable = false;
    }
    handleSuccess(event) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: "Updated Successfully",
                message: "Asset " + event.detail.Name + "is updated Successfully",
                variant: "success"
            })
        );
        location.reload();
        this.closeModal();
    }
    handleSubmit(event) {
        event.preventDefault();       // stop the form from submitting
        const fields = event.detail.fields;
        console.log(JSON.stringify(fields));
        if (fields.LocationId && fields.ParentId) {

            getAssetWithSameLocation({ parentId: fields.ParentId, locationId: fields.LocationId, childAsset: this.selecteChildRecId })
                .then((result) => {
                    console.log(result);

                    if (result.length > 0) {
                        this.dispatchEvent(
                            new ShowToastEvent({
                                title: "Warning",
                                message: "Asset Location doesn't match Please see below other Child Asset with Same Location",
                                variant: "warning"
                            })
                        )
                        this.assetWithSameLocation = result;
                    } else {
                        this.template.querySelector('lightning-record-edit-form').submit(fields);

                    }
                })
                .catch((error) => {
                    console.log("Error loading child accounts", error);
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: "Error Loading Children Assets",
                            message: error + " " + error?.message,
                            variant: "error"
                        })
                    );
                })
                .finally(() => {
                    this.isLoading = false;
                });

        } else {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: "Location can't empty for child asset",
                    variant: "error"
                })
            );
        }
    }
}