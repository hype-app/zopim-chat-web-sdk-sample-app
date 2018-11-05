⚠️ Use of this software is subject to important terms and conditions as set forth in the License file ⚠️

# Helpdesk Chat Widget powered by Zendesk Chat Web SDK and Microsoft QnA Bot

This app deploys a simple chat widget using the [Zendesk Chat Web SDK](https://api.zopim.com/web-sdk) and the [Microsoft QnA API](https://azure.microsoft.com/it-it/services/cognitive-services/qna-maker/).

Built using the [React](https://facebook.github.io/react/) framework and [Redux](http://redux.js.org/) architecture.

Screenshots:

| Normal                             | Docked                             |
| :--------------------------------: | :--------------------------------: |
| ![](screenshots/normal_widget.png) | ![](screenshots/docked_widget.png) |

## Getting Started
### Setup
You will need:
- [Node.js](http://nodejs.org/) at least version 4.5.0
- [npm](https://www.npmjs.com/)

Then run:
```
npm install
```
to install all the dependencies.

A postinstall script should automatically download the latest version of the SDK (refer to the [Getting the SDK](https://api.zopim.com/web-sdk/#getting-the-sdk) section of the documentation).

Make sure the downloaded file is named `web-sdk.js` and located in the `vendor` folder, otherwise download and place it there manually.

### Running
To compile and run the sample app, run the following command:
```
npm start
```

This would open your browser pointing at [127.0.0.1:8000](http://127.0.0.1:8000).

### Configuration (deprecated)
To set your Zendesk Chat account key, navigate to the configuration file at [`src/config/base.js`](src/config/base.js).

Modify the content of the file as follows:
```javascript
export default {
	ACCOUNT_KEY: 'YOUR_ACCOUNT_KEY'
}
```

### Configuration
All the configuration parameters should be set in the init method.

## Compiling the Widget
To compile the the widget, run `npm run dist`.

At the end of the compilation, you can find the widget at `dist/assets/widget.js`, which you can now use to embed in your website via a `script` tag as follows:

```html
<script type="text/javascript" src="/path/to/widget.js"></script>
```
## Testing locally 
If you are using `localhost` to test the sample code, you will get visitor session disconnections on page change or refresh. This is due to `localhost` storing but not persisting the visitor cookie. Each page change will cause the visitor to re-register with a new cookie value. 

To get around this, use the IP address of the machine (ex. `https://127.0.0.1`) or assign a local domain name.

## Contributions
Pull requests are welcome.

## Bugs
Please submit bug reports to [Zendesk](https://support.zendesk.com/requests/new).

## License
Copyright &copy; 2016 Zendesk, Inc.
Modifications copyright &copy; 2018 Bemind Interactive, srl.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.

You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
