import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IDocumentManager } from '@jupyterlab/docmanager';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { KernelMessage, Kernel, Session } from '@jupyterlab/services';

import { IChangedArgs, PathExt } from '@jupyterlab/coreutils';

import { ISessionContext } from '@jupyterlab/apputils';

function sessionChanged(
  documentManager: IDocumentManager,
  paths: JupyterFrontEnd.IPaths,
  session: Session.ISessionConnection | null
): void {
  if (session) {
    session.anyMessage.connect(
      (sender: Session.ISessionConnection, args: Kernel.IAnyMessageArgs) => {
        if (
          args.direction === 'recv' &&
          KernelMessage.isExecuteReplyMsg(args.msg) &&
          args.msg.content.status === 'ok'
        ) {
          for (const payload of args.msg.content.payload || []) {
            if (payload['source'] === 'edit_magic') {
              let path = String(payload['filename']);
              if (path[0] === '/') {
                path = path.replace(
                  paths.directories.serverRoot[0] === '~'
                    ? new RegExp(
                        '.*?' +
                          paths.directories.serverRoot
                            .substring(1)
                            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                      )
                    : paths.directories.serverRoot,
                  ''
                );
              }
              documentManager.openOrReveal(PathExt.removeSlash(path));
            }
          }
        }
      }
    );
  }
}

/**
 * Initialization data for the jupyterlab-edit-magic extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-edit-magic:plugin',
  autoStart: true,
  requires: [IDocumentManager, JupyterFrontEnd.IPaths, INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    documentManager: IDocumentManager,
    paths: JupyterFrontEnd.IPaths,
    notebookTracker: INotebookTracker
  ) => {
    console.log('jupyterlab-edit-magic activated.');
    notebookTracker.widgetAdded.connect(
      async (sender: any, nbPanel: NotebookPanel) => {
        await nbPanel.sessionContext.ready;
        sessionChanged(documentManager, paths, nbPanel.sessionContext.session);
        nbPanel.sessionContext.sessionChanged.connect(
          (
            sender: ISessionContext,
            args: IChangedArgs<
              Session.ISessionConnection | null,
              Session.ISessionConnection | null,
              'session'
            >
          ) => {
            sessionChanged(documentManager, paths, args.newValue);
          }
        );
      }
    );
  }
};

export default plugin;
