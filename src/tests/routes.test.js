const request = require('supertest')
const app = require('../server')

describe('Test Endpoints', () => {
    it('should show homepage', async () => {
        const response = await request(app).get(`/`)
        expect(response.statusCode).toEqual(200)
        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty(
            'message',
            'Welcome warriors to Golden Owl!'
        )
        expect(response.header['content-type']).toMatch(/json/)
    })

    it('should report healthy', async () => {
        const response = await request(app).get('/health')
        expect(response.status).toBe(200)
        expect(response.body).toEqual({ status: 'ok' })
    })
})
