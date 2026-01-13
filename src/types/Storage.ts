export interface RycuStorage {
  initialized: boolean;
  showHandleToName: boolean;
  showNameToHandle: boolean;
  replaceComments: boolean;
  replaceLiveChats: boolean;
}

export const getDefaultStorageCache = (): RycuStorage => ({
  initialized: false,
  showHandleToName: false,
  showNameToHandle: false,
  replaceComments: true,
  replaceLiveChats: true,
});
