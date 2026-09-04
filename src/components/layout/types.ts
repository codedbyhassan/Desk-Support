import type { ComponentType } from 'react'
export interface NavItem{name:string;href:string;icon:ComponentType<any>;badge?:string;description?:string;id:string;adminOnly?:boolean;adminOrHR?:boolean;managerOrAbove?:boolean}
export interface NavLinksProps{items:NavItem[];pathname:string}
