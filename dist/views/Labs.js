"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var _react=_interopRequireDefault(require("react")),_semanticUiReact=require("semantic-ui-react");function _interopRequireDefault(a){return a&&a.__esModule?a:{default:a}}class LabRow extends _react.default.Component{constructor(){super(),this.state={loading:!1}}deleteLab(){this.state.loading||(this.setState({loading:"delete"}),fetch("lab/"+encodeURIComponent(this.props.lab._id),{method:"DELETE",headers:{"if-match":this.props.lab._rev}}).then(a=>{a.ok?window.location.reload():this.setState({loading:null})}).catch(()=>{this.setState({loading:null})}))}cloneLab(a){this.state.loading||(this.setState({loading:"clone"}),fetch("lab/"+encodeURIComponent(a),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(this.props.lab)}).then(a=>a.ok?a.json().then(a=>{window.location.href="lab/"+encodeURIComponent(a._id)}):void this.setState({loading:null})).catch(()=>{this.setState({loading:null})}))}startLab(a){if(this.state.loading)return;this.setState({loading:"start"});const b="lab/"+encodeURIComponent(this.props.lab._id)+"/instance/"+encodeURIComponent(a);fetch(b,{method:"POST",headers:{"if-match":this.props.lab._rev}}).then(a=>{a.ok?window.location.href=b:this.setState({loading:null})}).catch(()=>{this.setState({loading:null})})}render(){const a=this.props.lab,b=[];for(const c in a.repositories)b.push(_react.default.createElement("p",{key:c},c," (",a.repositories[c].name,a.repositories[c].head&&"/"+a.repositories[c].head,")"));return _react.default.createElement(_semanticUiReact.Table.Row,null,_react.default.createElement(_semanticUiReact.Table.Cell,null,a._id),_react.default.createElement(_semanticUiReact.Table.Cell,null,"assistant"in a?a.assistant.url:_react.default.createElement("i",null,"None")),_react.default.createElement(_semanticUiReact.Table.Cell,null,"machineOrder"in a?a.machineOrder.map(b=>_react.default.createElement("p",{key:b},a.machines[b].base," (",a.machines[b].description,")")):_react.default.createElement("i",null,"None")),_react.default.createElement(_semanticUiReact.Table.Cell,{singleLine:!0},b.length?b:_react.default.createElement("i",null,"None")),_react.default.createElement(_semanticUiReact.Table.Cell,{singleLine:!0},"endpoints"in a?a.endpoints.map(a=>_react.default.createElement("p",{key:a},a)):_react.default.createElement("i",null,"None")),_react.default.createElement(_semanticUiReact.Table.Cell,null,_react.default.createElement("a",{href:"lab/"+encodeURIComponent(a._id)},"Details")),_react.default.createElement(_semanticUiReact.Table.Cell,{collapsing:!0},_react.default.createElement(_semanticUiReact.Popup,{on:"click",position:"top center",wide:!0,hideOnScroll:!0,trigger:_react.default.createElement(_semanticUiReact.Button,{color:"green",disabled:!!this.state.loading,loading:"start"===this.state.loading,icon:!0},_react.default.createElement(_semanticUiReact.Icon,{name:"caret square right"})," Start"),onOpen:()=>setTimeout(()=>this.refs.username.focus(),1)},_react.default.createElement(_semanticUiReact.Form,{style:{marginBottom:"0px"}},_react.default.createElement(_semanticUiReact.Input,{ref:"username",placeholder:"Username"}),_react.default.createElement("br",null),_react.default.createElement(_semanticUiReact.Button,{positive:!0,onClick:()=>this.startLab(this.refs.username.inputRef.value)},"Go")))),_react.default.createElement(_semanticUiReact.Table.Cell,{collapsing:!0},_react.default.createElement(_semanticUiReact.Popup,{on:"click",position:"top center",wide:!0,hideOnScroll:!0,trigger:_react.default.createElement(_semanticUiReact.Button,{color:"violet",disabled:!!this.state.loading,loading:"clone"===this.state.loading,icon:!0},_react.default.createElement(_semanticUiReact.Icon,{name:"clone"})," Clone"),onOpen:()=>setTimeout(()=>this.refs.cloneName.focus(),1)},_react.default.createElement(_semanticUiReact.Form,{style:{marginBottom:"0px"}},_react.default.createElement(_semanticUiReact.Input,{ref:"cloneName",placeholder:"Lab name",defaultValue:a._id}),_react.default.createElement(_semanticUiReact.Button,{positive:!0,onClick:()=>this.cloneLab(this.refs.cloneName.inputRef.value)},"Create")))),_react.default.createElement(_semanticUiReact.Table.Cell,{collapsing:!0},_react.default.createElement(_semanticUiReact.Popup,{on:"click",position:"top center",wide:!0,hideOnScroll:!0,trigger:_react.default.createElement(_semanticUiReact.Button,{negative:!0,disabled:!!this.state.loading,loading:"delete"===this.state.loading,icon:!0},_react.default.createElement(_semanticUiReact.Icon,{name:"trash"})," Delete")},_react.default.createElement(_semanticUiReact.Button,{negative:!0,onClick:()=>this.deleteLab()},"Confirm deletion"))))}}class Labs extends _react.default.Component{constructor(a){super(),this.state={labs:a.labs,loading:!1}}newLab(a){this.state.loading||(this.setState({loading:"new"}),fetch("lab/"+encodeURIComponent(a),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({})}).then(a=>a.ok?a.json().then(a=>{window.location.href="lab/"+encodeURIComponent(a._id)}):void this.setState({loading:null})).catch(()=>{this.setState({loading:null})}))}render(){const a=[];for(const b of this.state.labs)a.push(_react.default.createElement(LabRow,{key:b._id,lab:b}));return _react.default.createElement(_semanticUiReact.Grid,null,_react.default.createElement(_semanticUiReact.Grid.Column,null,_react.default.createElement(_semanticUiReact.Header,{size:"large",color:"teal"},"Labs"),_react.default.createElement(_semanticUiReact.Table,null,_react.default.createElement(_semanticUiReact.Table.Header,null,_react.default.createElement(_semanticUiReact.Table.Row,null,_react.default.createElement(_semanticUiReact.Table.HeaderCell,null,"Lab"),_react.default.createElement(_semanticUiReact.Table.HeaderCell,null,"Assistant"),_react.default.createElement(_semanticUiReact.Table.HeaderCell,null,"Machines"),_react.default.createElement(_semanticUiReact.Table.HeaderCell,null,"Repositories"),_react.default.createElement(_semanticUiReact.Table.HeaderCell,null,"Endpoints"),_react.default.createElement(_semanticUiReact.Table.HeaderCell,{colSpan:4}))),_react.default.createElement(_semanticUiReact.Table.Body,null,a),_react.default.createElement(_semanticUiReact.Table.Footer,null,_react.default.createElement(_semanticUiReact.Table.Row,null,_react.default.createElement(_semanticUiReact.Table.Cell,{colSpan:7},_react.default.createElement(_semanticUiReact.Popup,{on:"click",position:"top center",wide:!0,trigger:_react.default.createElement(_semanticUiReact.Button,{positive:!0,disabled:!!this.state.loading,loading:"new"===this.state.loading},"New"),onOpen:()=>setTimeout(()=>this.refs.newName.focus(),1)},_react.default.createElement(_semanticUiReact.Form,{style:{marginBottom:"0px"}},_react.default.createElement(_semanticUiReact.Input,{ref:"newName",placeholder:"Lab name"}),_react.default.createElement(_semanticUiReact.Button,{positive:!0,onClick:()=>this.newLab(this.refs.newName.inputRef.value)},"Create")))))))))}}exports.default=Labs;