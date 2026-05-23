import { ProductManifest } from '../../frontend/src/types'

export const manifest: ProductManifest = {
    name: 'Games',
    scenes: {
        FlappyHog: {
            name: 'FlappyHog',
            import: () => import('./FlappyHog/FlappyHog'),
            projectBased: true,
            activityScope: 'Games',
        },
    },
    routes: {
        '/games/flappyhog': ['FlappyHog', 'flappyHog'],
    },
    urls: {
        flappyHog: (): string => `/games/flappyhog`,
    },
    treeItemsGames: [
        {
            path: 'Flappy Hog',
            href: '/games/flappyhog',
        },
    ],
}
