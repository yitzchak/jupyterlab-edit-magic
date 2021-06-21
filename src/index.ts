import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IDocumentManager } from '@jupyterlab/docmanager';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { KernelMessage, Kernel, Session } from '@jupyterlab/services';

import { IChangedArgs } from '@jupyterlab/coreutils';

import { ISessionContext } from '@jupyterlab/apputils';

function session_changed(
  documentManager: IDocumentManager,
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
              documentManager.openOrReveal(String(payload['filename']));
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
  requires: [IDocumentManager, INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    documentManager: IDocumentManager,
    notebookTracker: INotebookTracker
  ) => {
    notebookTracker.widgetAdded.connect(
      async (sender: any, nbPanel: NotebookPanel) => {
        await nbPanel.sessionContext.ready;
        session_changed(documentManager, nbPanel.sessionContext.session);
        nbPanel.sessionContext.sessionChanged.connect(
          (
            sender: ISessionContext,
            args: IChangedArgs<
              Session.ISessionConnection | null,
              Session.ISessionConnection | null,
              'session'
            >
          ) => {
            session_changed(documentManager, args.newValue);
          }
        );
      }
    );
  }
};

export default plugin;
