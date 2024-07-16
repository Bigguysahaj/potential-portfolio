/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import * as THREE from 'three'
import { useEffect, useRef, useState } from 'react'
import { useGLTF, useTexture, Environment, Lightformer } from '@react-three/drei'
import { Canvas, extend, useThree, useFrame, type Object3DNode } from '@react-three/fiber'
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from '@react-three/rapier'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'

// In order to use the MeshLine library, which is vanilla Three.js in React,
// we need to extend it. The extend function extends React Three Fiber's 
// catalog of known JSX elements.

extend({ MeshLineGeometry, MeshLineMaterial })

useGLTF.preload('./tag-no-name.glb')
useTexture.preload('https://assets.vercel.com/image/upload/contentful/image/e5382hct74si/SOT1hmCesOHxEYxL7vkoZ/c57b29c85912047c414311723320c16b/band.jpg')

declare module '@react-three/fiber' {
  interface ThreeElements {
    meshLineGeometry: Object3DNode<MeshLineGeometry, typeof MeshLineGeometry>
    meshLineMaterial: Object3DNode<MeshLineMaterial, typeof MeshLineMaterial>
  }
}

type BandProps = {
  maxSpeed?: number
  minSpeed?: number
}

type MeshLineMesh = THREE.Mesh & {
  geometry: MeshLineGeometry
  material: MeshLineMaterial
}

interface CustomMaterial extends THREE.Material {
  map?: THREE.Texture;
}

type GLTFResult = {
  nodes: {
    card?: THREE.Mesh
    clip?: THREE.Mesh
    clamp?: THREE.Mesh
  }
  materials: {
    base?: CustomMaterial
    metal?: CustomMaterial
  }
}

export function IdCard() { 
  return (
    <Canvas camera={{ position: [0, 0, 13], fov: 25 }}>
      <ambientLight intensity={Math.PI} />
      {/* 
        - debug flag : renders wireframes or outlines of collision shapes
        - interpolate flag : basically makes the animation smoother by interpolating in-between steps
        - gravity : basic gravity in x, y, z directions
        - timeStep (1/60) : means the physics world will update 60 times per second,
        regardless of the actual frame rate. 
      */}
      <Physics interpolate gravity={[0, -40, 0]} timeStep={1 / 60}>
        <Band />
      </Physics>
      <Environment background blur={0.75}>
        <color attach="background" args={['black']} />
        <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
        <Lightformer intensity={3} color="white" position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
        <Lightformer intensity={3} color="white" position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
        <Lightformer intensity={10} color="white" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
      </Environment>
    </Canvas>
  )
}

// Setting up the band of the Id Card.

const Band: React.FC<BandProps> = ({ maxSpeed = 50, minSpeed = 10 }) => {
  // Different components of the band
  // By having all of them be ref, we make sure that when they change the component is not RE-RENDERED.
  const band = useRef<MeshLineMesh>(null)
  const fixed = useRef<any>(null)
  const joint1 = useRef<any>(null)
  const joint2 = useRef<any>(null)
  const joint3 = useRef<any>(null)
  const card = useRef<any>(null)
  const vec = new THREE.Vector3()
  const angle = new THREE.Vector3()
  const rotation = new THREE.Vector3()
  const direction = new THREE.Vector3()

  const segmentProps : any = { type: 'dynamic', canSleep: true, colliders: false, angularDamping: 2, linearDamping: 2 }
  const { nodes, materials } = useGLTF('./tag-no-name.glb') as GLTFResult
  const texture = useTexture('https://assets.vercel.com/image/upload/contentful/image/e5382hct74si/SOT1hmCesOHxEYxL7vkoZ/c57b29c85912047c414311723320c16b/band.jpg')

  // Canvas size 
  const { width, height } = useThree((state) => state.size)
  // We want to turn the physics sim, when user drags, but when they release we re-run the physics sim
  const [dragged, drag] = useState<any>(false)
  const [hovered, hover] = useState(false)

  // Catmull-Rom curve (interesting path curve while interaction)
  const [curve] = useState<THREE.CatmullRomCurve3>(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()
  ]))

  // Defining where the joints exist
  useRopeJoint(fixed, joint1, [[0,0,0] , [0,0,0] , 1]) // prettier-ignore
  useRopeJoint(joint1, joint2, [[0,0,0] , [0,0,0] , 1]) // prettier-ignore
  useRopeJoint(joint2, joint3, [[0,0,0] , [0,0,0] , 1])
  useSphericalJoint(joint3, card, [[0,0,0] , [0,1.45,0]])

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? 'grabbing' : 'grab'
      return () => void (document.body.style.cursor = 'auto')
    }
  }, [hovered, dragged])

  // Calculating the dragged state is the tricky bit, for translating a pointer event coordinate to a 3D object
  // which is called (camera unprojection). Three.js has a method for this, unproject(state.camera) which does most
  // math.

  useFrame((state, delta) => {
    if (dragged) {
      // Physics sim is off in this if.
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      direction.copy(vec).sub(state.camera.position).normalize()
      vec.add(direction.multiplyScalar(state.camera.position.length()))
      ;[card, joint1, joint2, joint3, fixed].forEach((ref : any) => ref.current?.wakeUp())
      card.current?.setNextKinematicTranslation({ x: vec.x - dragged.x, y: vec.y - dragged.y, z: vec.z - dragged.z })
    }

    if (fixed.current) {
      // Fix most of the jitter when over pulling the card
      ;[joint1, joint2].forEach((ref) => {
        if (!ref.current.lerped) ref.current.lerped = new THREE.Vector3().copy(ref.current.translation())
        const clampedDistance = Math.max(0.1, Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())))
        ref.current.lerped.lerp(ref.current.translation(), delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed)))
      })

      // Calculate catmul curve      
      curve.points[0]?.copy(joint3.current.translation())
      curve.points[1]?.copy(joint2.current.translation())
      if (joint1.current){
        curve.points[2]?.copy(joint1.current.translation())
      }
      curve.points[3]?.copy(fixed.current.translation())
      band.current?.geometry.setPoints(curve.getPoints(32))
      // Tilt it back towards the screen
      angle.copy(card.current.angvel())
      rotation.copy(card.current.rotation())

      // The code below makes sure the card is always facing you after rotation
      card.current.setAngvel({ x: angle.x, y: angle.y - rotation.y * 0.25, z: angle.z })
    }
  })

  curve.curveType = 'chordal'
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={joint1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={joint2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody >
        <RigidBody position={[1.5, 0, 0]} ref={joint3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody >
        <RigidBody position={[2, 0, 0]} ref={card} {...segmentProps} type={dragged ? 'kinematicPosition' : 'dynamic'} >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={2.25}
            position={[0, -1.2, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={(e: any) => (e.target.releasePointerCapture(e.pointerId), drag(false))}
            onPointerDown={(e: any) => (e.target.setPointerCapture(e.pointerId), drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation()))))}
          >
            <mesh geometry={nodes.card?.geometry}>
              <meshPhysicalMaterial map={materials.base?.map} map-anisotropy={16} clearcoat={1} clearcoatRoughness={0.15} roughness={0.3} metalness={0.5} />
            </mesh>
            <mesh geometry={nodes.clip?.geometry} material={materials.metal} material-roughness={0.3} />
            <mesh geometry={nodes.clamp?.geometry} material={materials.metal} />
          </group>
        </RigidBody >
      </group >
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial color="white" depthTest={false} resolution={new THREE.Vector2(width, height)} useMap={1} map={texture} repeat={new THREE.Vector2(-3, 1)} lineWidth={1} />
      </mesh>
    </>
  )
}


