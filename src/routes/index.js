const { Router } = require('express')

const router = Router()

router.get('/', (req, res) => {
    const responseJson = {
        message: 'Welcome warriors to Golden Owl!',
    }
    res.json(responseJson)
})

router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' })
})


module.exports = router
