const {
	app, BrowserWindow, Menu, ipcMain, Tray,
} = require( `electron` );
const path = require( `path` );
const Store = require( `./Store` );

// Set env
process.env.NODE_ENV = `development`;

const isDev = process.env.NODE_ENV !== `production`;
const isMac = process.platform === `darwin`;

let mainWindow;
let tray;

const store = new Store( {
	configName : `user-settings`,
	defaults   : {
		settings: {
			cpuOverload    : 80, // In Perentage
			alertFrequency : 5, // In minuts
		},
	},
} );

function createMainWindow()
{
	mainWindow = new BrowserWindow( {
		title          : `SysTop`,
		width          : isDev ? 800 : 500,
		height         : 600,
		icon           : `./assets/icons/icon.png`,
		resizable      : !!isDev,
		show           : false,
		opacity        : 0.9,
		webPreferences : {
			nodeIntegration: true,
		},
	} );

	if ( isDev )
	{
		mainWindow.webContents.openDevTools();
	}

	mainWindow.loadFile( `./app/index.html` );
}

function createTrayIcon()
{
	const icon = path.join( `assets`, `icons`, `tray_icon.png` );
	tray = new Tray( icon );

	tray.on( `click`, () =>
	{
		if ( mainWindow.isVisible() === true )
		{
			mainWindow.hide();
		}
		else
		{
			mainWindow.show();
		}
	} );

	tray.on( `right-click`, () =>
	{
		const contextMenu = Menu.buildFromTemplate( [
			{
				label : `Quit`,
				click : ( ) =>
				{
					app.isQuitting = true;
					app.quit();
				},
			},
		] );

		tray.popUpContextMenu( contextMenu );
	} );
}

const menu = [
	...( isMac ? [{ role: `appMenu` }] : [] ),
	{
		role: `fileMenu`,
	},
	{
		label   : `View`,
		submenu : [
			{
				label : `Toggle Navigation`,
				click : () => mainWindow.webContents.send( `nav:toggle` ),
			},
		],
	},
	...( isDev
		? [
			{
				label   : `Developer`,
				submenu : [
					{ role: `reload` },
					{ role: `forcereload` },
					{ type: `separator` },
					{ role: `toggledevtools` },
				],
			},
		]
		: [] ),
];

app.on( `ready`, () =>
{
	createMainWindow();

	mainWindow.webContents.on( `dom-ready`, () =>
	{
		mainWindow.webContents.send( `settings:get`, store.get( `settings` ) );
	} );

	const mainMenu = Menu.buildFromTemplate( menu );
	Menu.setApplicationMenu( mainMenu );


	mainWindow.on( `close`, ( e ) =>
	{
		if ( !app.isQuitting )
		{
			e.preventDefault();
			mainWindow.hide();
		}

		return true;
	} );

	createTrayIcon();

	mainWindow.on( `ready`, () =>
	{
		mainWindow = null;
	} );
} );

app.on( `window-all-closed`, () =>
{
	if ( !isMac )
	{
		app.quit();
	}
} );

app.on( `activate`, () =>
{
	if ( BrowserWindow.getAllWindows().length === 0 )
	{
		createMainWindow();
	}
} );

ipcMain.on( `settings:set`, ( _e, payload ) =>
{
	store.set( `settings`, payload );

	mainWindow.webContents.send( `settings:get`, payload );
} );

app.allowRendererProcessReuse = true;
