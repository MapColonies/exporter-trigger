import { OperationStatus } from "@map-colonies/mc-priority-queue";
import { JobResponse } from "../../../src/common/interfaces";

export const mockJob: JobResponse = {
  id: 'b729f0e0-af64-4c2c-ba4e-e799e2f3df0f',
  resourceId: 'test',
  version: '1.0',
  type: 'rasterTilesExporter',
  description: '',
  parameters: {
    crs: 'EPSG:4326',
    fileName: 'test.gpkg',
    callbacks: [
      {
        url: 'http://example.getmap.com/callback',
        bbox: [
          34.811938017107494,
          31.95475033759175,
          34.82237261707599,
          31.96426962177354
        ]
      },
      {
        url: 'http://example.getmap.com/callback2',
        bbox: [
          34.811938017107494,
          31.95475033759175,
          34.82237261707599,
          31.96426962177354
        ]
      }
    ],
    zoomLevel: 3,
    sanitizedBbox: [ 0, -90, 180, 90 ],
    targetResolution: 0.072
  },
  status: OperationStatus.IN_PROGRESS,
  percentage: 100,
  reason: '',
  isCleaned: false,
  priority: 0,
  expirationDate: new Date(),
  internalId: '880a9316-0f10-4874-92e2-a62d587a1169',
  producerName: undefined,
  productName: 'test',
  productType: 'Orthophoto',
  additionalIdentifiers: '0,-90,180,903',
  taskCount: 1,
  completedTasks: 0,
  failedTasks: 0,
  expiredTasks: 0,
  pendingTasks: 0,
  inProgressTasks: 0,
  abortedTasks: 0,
  tasks: [],
  created: '2022-08-29T07:06:05.043Z',
  updated: '2022-08-29T07:13:05.206Z'
}
