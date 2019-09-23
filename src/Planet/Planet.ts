import * as BABYLON from "babylonjs"
import { PlanetMesh } from './PlanetMesh'
import OpenSimplexNoise from 'open-simplex-noise'
import { convolute } from "../Filters/convolute"

type VertexNormals = BABYLON.FloatArray
type VertexUV = BABYLON.FloatArray
const normalize = (val, min, max) => ((val - min) / (max - min))

/**
 * @see https://www.redblobgames.com/maps/terrain-from-noise/
 * @see https://www.redblobgames.com/maps/mapgen4/
 */
class Planet extends BABYLON.TransformNode {
  seed: string
  mesh: PlanetMesh
  scene: BABYLON.Scene

  constructor(name: string = 'planet', scene) {
    super(name)
    this.scene = scene
    const options = { diameter: 1, diameterX: 1, subdivisions: 90 }

    this.mesh = new PlanetMesh('myPlanet', options as any, scene)
    this.mesh.setParent(this)

    setTimeout(() => {
      this.mesh.material = this.generateMaterial(scene)
    }, 100)

    this.setInspectableProperties()
  }

  set subdivisions(value: number) {
    this.mesh.subdivisions = value
  }

  get subdivisions(): number {
    return this.mesh.subdivisions
  }

  /**
   * New procedural material generation
   */
  protected generateMaterial(scene): BABYLON.Material {
    const normals = this.mesh.planetMesh.getVerticesData(BABYLON.VertexBuffer.NormalKind)
    const uv = this.mesh.planetMesh.getVerticesData(BABYLON.VertexBuffer.UVKind)
    const material = new BABYLON.StandardMaterial("planet", scene);

    const heightMap = this.generateHeightMap(normals, uv)
    // material.bumpTexture = this.generateNormalMap(heightMap, normals, uv)
    // material.diffuseTexture = new BABYLON.Texture("textures/planetObjectSpaceNormal.png", scene, true)
    material.diffuseTexture = heightMap
    material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    // material.bumpTexture = new BABYLON.Texture("textures/planetNormal.png", scene)
    // material.diffuseColor = new BABYLON.Color3(0.8, 0.26, 0.4)
    // material.emissiveColor = new BABYLON.Color3(1, 1, 1);
    material.specularPower = 14

    return material
  }

  generateNormalMap(heightMap: BABYLON.DynamicTexture, normals: VertexNormals, uv: VertexUV): BABYLON.Texture {
    const TEX_RES = 256

    const texture = new BABYLON.DynamicTexture("texture", TEX_RES, this.scene, false)
    const normalCtx = heightMap.getContext();
    const ctx = texture.getContext();

    // todo

    texture.update();
    return texture
  }

  generateHeightMap(normals: VertexNormals, uv: VertexUV): BABYLON.DynamicTexture {
    const TEX_RES = 2048
    // const settings = { layers: 12, strength: 1, roughness: 0.6, resistance: 0.70, min: 0.5 }
    const settings = { layers: 12, strength: 1, roughness: 0.6, resistance: 0.70, min: 0.4 }

    const texture = new BABYLON.DynamicTexture("planetHeightMap", TEX_RES, this.scene, true)
    const ctx = texture.getContext();

    const openSimplex = new OpenSimplexNoise(Date.now());
    const sphereNormalTexture = new Image();
    sphereNormalTexture.src = 'textures/planetObjectSpaceNormal.png';
    sphereNormalTexture.onload = function () {
      console.time('generateHeightMap')
      ctx.drawImage(this as CanvasImageSource, 0, 0, TEX_RES, TEX_RES)
      const sphereNormals = ctx.getImageData(0, 0, TEX_RES, TEX_RES).data

      const numberOfPixels = sphereNormals.length / 4
      ctx.fillStyle = `rgb(0,0,0)`
      // ctx.fillRect(0, 0, TEX_RES, TEX_RES)

      for (let i = 0; i < numberOfPixels; i++) {
        const a = i*4
        const [x, y] = [((i - 1) % TEX_RES) + 1, Math.max(0, Math.floor((i - 1) / TEX_RES))]
        let roughness = settings.roughness/100
        let strength = settings.strength
        let value = 0
        const [r, g, b] = [
          sphereNormals[a] + Math.random() * 1.5,// + x % 3 / 4,
          sphereNormals[a + 1] + Math.random() * 1.5,// + y % 3 / 4,
          sphereNormals[a + 2]
        ]
        if (r+g+b===0) {
          continue
        }
        for (let layer = 0; layer < settings.layers; layer++) {
          value += openSimplex.noise3D(r * roughness, g * roughness, b * roughness) * strength;
          roughness = roughness * 2
          strength = strength * settings.resistance
        }
        // value += Math.random()/6
        value = Math.max(value * 128 + 128, 255 * settings.min)
        value = normalize(value, 255 * settings.min, 255) * 255
        if (value===0) {
          continue
        }
        ctx.fillStyle = `rgb(${value}, ${value}, ${value})`
        // ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        ctx.fillRect(x, y, 1, 1)
      }

      texture.update();
      console.timeEnd('generateHeightMap')
    }

    return texture
  }

  protected setInspectableProperties() {
    this.inspectableCustomProperties = [
      {
        label: "Subdivisions",
        propertyName: "subdivisions",
        type: BABYLON.InspectableType.Slider,
        min: 3,
        max: 256,
        step: 1
      }
    ]
  }
}

export { Planet }
