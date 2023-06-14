'use client'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { ChakraProvider, Button, Flex, Heading } from '@chakra-ui/react'
import { Image, SimpleGrid, Tooltip } from '@chakra-ui/react'


const APIKEY = process.env.NEXT_PUBLIC_GC_API_KEY
const SCORERID = process.env.NEXT_PUBLIC_GC_SCORER_ID

// endpoint for submitting passport
const SUBMIT_PASSPORT_URI = 'https://api.scorer.gitcoin.co/registry/submit-passport'
// endpoint for getting the signing message
const SIGNING_MESSAGE_URI = 'https://api.scorer.gitcoin.co/registry/signing-message'
// score needed to see hidden message
const thresholdNumber = 20
const headers = APIKEY ? ({
  'Content-Type': 'application/json',
  'X-API-Key': APIKEY
}) : undefined


interface Stamp {
  id: number
  stamp: string
  icon: string
}


export default function Passport() {
  // here we deal with any local state we need to manage
  const [address, setAddress] = useState<string>('')
  const [showStamps, setShowStamps] = useState<boolean>(false)
  const [stampArray, setStampArray] = useState<Array<Stamp>>([])

  useEffect(() => {
    setShowStamps(false)
    checkConnection()
    async function checkConnection() {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.listAccounts()
        // if the user is connected, set their account
        if (accounts && accounts[0]) {
          setAddress(accounts[0].address)
        }
      } catch (err) {
        console.log('not connected...')
      }
    }
  }, [])

  async function connect() {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      setAddress(accounts[0])
    } catch (err) {
      console.log('error connecting...')
    }
  }

  async function getSigningMessage() {
    try {
      const response = await fetch(SIGNING_MESSAGE_URI, {
        headers
      })
      const json = await response.json()
      return json
    } catch (err) {
      console.log('error: ', err)
    }
  }

  async function getStamps() {
    console.log("in getStamps()")
    const stampProviderArray = []
    const GET_PASSPORT_STAMPS_URI = `https://api.scorer.gitcoin.co/registry/stamps/${address}?include_metadata=true`
    try {
      const response: Response = await fetch(GET_PASSPORT_STAMPS_URI, { headers })
      const data = await response.json()
      // parse stamp data from json
      let counter = 0
      for (const i of data.items) {
        let st = { id: counter, stamp: i.credential.credentialSubject.provider, icon: i.metadata.platform.icon }
        stampProviderArray.push(st)
        counter += 1
      }
      setStampArray(stampProviderArray)
      setShowStamps(true)
      return
    } catch (err) {
      console.log('error: ', err)
    }
  }


  async function submitPassport() {
    try {
      // call the API to get the signing message and the nonce
      const { message, nonce } = await getSigningMessage()
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      // ask the user to sign the message
      const signature = await signer.signMessage(message)
      // call the API, sending the signing message, the signature, and the nonce
      const response = await fetch(SUBMIT_PASSPORT_URI, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          address,
          scorer_id: SCORERID,
          signature,
          nonce
        })
      })

      const data = await response.json()
      console.log('data:', data)
    } catch (err) {
      console.log('error: ', err)
    }
  }

  const StampCollection = () => {
    return (
      <SimpleGrid minChildWidth='120px' spacing='40px' border='black'>
        <>
          {stampArray.map(s => <Tooltip key={s.id} label={s.stamp}><Image src={s.icon} alt={s.stamp} borderRadius='90px' boxSize='80px' fallbackSrc='gtc-logo.svg' backgroundColor='#C3D3D5' /></Tooltip>)}
        </>
      </SimpleGrid >
    )
  }

  const styles = {
    main: {
      width: '900px',
      margin: '0 auto',
      paddingTop: 90
    }
  }

  return (
    /* this is the UI for the app */
    <div style={styles.main}>
      <ChakraProvider >
        <Flex minWidth='max-content' alignItems='right' gap='2' justifyContent='right'>
          <Button colorScheme='teal' variant='outline' onClick={connect}>Connect Wallet</Button>
          <Button colorScheme='teal' variant='outline' onClick={submitPassport}>Connect Passport</Button>
          <Button colorScheme='teal' variant='outline' onClick={getStamps}>Show Stamps</Button>
        </Flex>
        <br />
        <br />
        <Heading as='h1' size='4xl' noOfLines={2}>Gitcoin Stamp Collector</Heading>
        <br />
        <br />
        <br />
        {showStamps && <StampCollection />}
      </ChakraProvider >
    </div >
  )
}